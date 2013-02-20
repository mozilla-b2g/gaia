/**
 * Implements the ActiveSync protocol for Hotmail and Exchange.
 **/

define('mailapi/activesync/account',
  [
    'rdcommon/log',
    'mailcomposer',
    'wbxml',
    'activesync/codepages',
    'activesync/protocol',
    '../a64',
    '../accountmixins',
    '../mailslice',
    '../searchfilter',
    './folder',
    './jobs',
    '../util',
    'module',
    'exports'
  ],
  function(
    $log,
    $mailcomposer,
    $wbxml,
    $ascp,
    $activesync,
    $a64,
    $acctmixins,
    $mailslice,
    $searchfilter,
    $asfolder,
    $asjobs,
    $util,
    $module,
    exports
  ) {
'use strict';

const bsearchForInsert = $util.bsearchForInsert;

const DEFAULT_TIMEOUT_MS = exports.DEFAULT_TIMEOUT_MS = 30 * 1000;

function ActiveSyncAccount(universe, accountDef, folderInfos, dbConn,
                           receiveProtoConn, _parentLog) {
  this.universe = universe;
  this.id = accountDef.id;
  this.accountDef = accountDef;

  if (receiveProtoConn) {
    this.conn = receiveProtoConn;
  }
  else {
    this.conn = new $activesync.Connection();
    this.conn.open(accountDef.connInfo.server, accountDef.credentials.username,
                   accountDef.credentials.password);
    this.conn.timeout = DEFAULT_TIMEOUT_MS;

    // XXX: We should check for errors during connection and alert the user.
    this.conn.connect();
  }

  this._db = dbConn;

  this._LOG = LOGFAB.ActiveSyncAccount(this, _parentLog, this.id);

  this.enabled = true;
  this.problems = [];

  this.identities = accountDef.identities;

  this.folders = [];
  this._folderStorages = {};
  this._folderInfos = folderInfos;
  this._serverIdToFolderId = {};
  this._deadFolderIds = null;

  this._syncsInProgress = 0;
  this._lastSyncKey = null;
  this._lastSyncResponseWasEmpty = false;

  this.meta = folderInfos.$meta;
  this.mutations = folderInfos.$mutations;

  // ActiveSync has no need of a timezone offset, but it simplifies things for
  // FolderStorage to be able to rely on this.
  this.tzOffset = 0;

  // Sync existing folders
  for (var folderId in folderInfos) {
    if (folderId[0] === '$')
      continue;
    var folderInfo = folderInfos[folderId];

    this._folderStorages[folderId] =
      new $mailslice.FolderStorage(this, folderId, folderInfo, this._db,
                                   $asfolder.ActiveSyncFolderSyncer, this._LOG);
    this._serverIdToFolderId[folderInfo.$meta.serverId] = folderId;
    this.folders.push(folderInfo.$meta);
  }

  this.folders.sort(function(a, b) { return a.path.localeCompare(b.path); });

  this._jobDriver = new $asjobs.ActiveSyncJobDriver(
                          this,
                          this._folderInfos.$mutationState);

  // Ensure we have an inbox.  The server id cannot be magically known, so we
  // create it with a null id.  When we actually sync the folder list, the
  // server id will be updated.
  var inboxFolder = this.getFirstFolderWithType('inbox');
  if (!inboxFolder) {
    // XXX localized Inbox string (bug 805834)
    this._addedFolder(null, '0', 'Inbox',
                      $ascp.FolderHierarchy.Enums.Type.DefaultInbox, true);
  }
}
exports.ActiveSyncAccount = ActiveSyncAccount;
ActiveSyncAccount.prototype = {
  type: 'activesync',
  toString: function asa_toString() {
    return '[ActiveSyncAccount: ' + this.id + ']';
  },

  toBridgeWire: function asa_toBridgeWire() {
    return {
      id: this.accountDef.id,
      name: this.accountDef.name,
      path: this.accountDef.name,
      type: this.accountDef.type,

      enabled: this.enabled,
      problems: this.problems,

      syncRange: this.accountDef.syncRange,

      identities: this.identities,

      credentials: {
        username: this.accountDef.credentials.username,
      },

      servers: [
        {
          type: this.accountDef.type,
          connInfo: this.accountDef.connInfo
        },
      ]
    };
  },

  toBridgeFolder: function asa_toBridgeFolder() {
    return {
      id: this.accountDef.id,
      name: this.accountDef.name,
      path: this.accountDef.name,
      type: 'account',
    };
  },

  get numActiveConns() {
    return 0;
  },

  saveAccountState: function asa_saveAccountState(reuseTrans, callback,
                                                  reason) {
    let account = this;
    let perFolderStuff = [];
    for (let [,folder] in Iterator(this.folders)) {
      let folderStuff = this._folderStorages[folder.id]
                           .generatePersistenceInfo();
      if (folderStuff)
        perFolderStuff.push(folderStuff);
    }

    this._LOG.saveAccountState(reason);
    let trans = this._db.saveAccountFolderStates(
      this.id, this._folderInfos, perFolderStuff, this._deadFolderIds,
      function stateSaved() {
        if (callback)
         callback();
      }, reuseTrans);
    this._deadFolderIds = null;
    return trans;
  },

  /**
   * We are being told that a synchronization pass completed, and that we may
   * want to consider persisting our state.
   */
  __checkpointSyncCompleted: function() {
    this.saveAccountState(null, null, 'checkpointSync');
  },

  shutdown: function asa_shutdown() {
    this._LOG.__die();
  },

  sliceFolderMessages: function asa_sliceFolderMessages(folderId,
                                                        bridgeHandle) {
    let storage = this._folderStorages[folderId],
        slice = new $mailslice.MailSlice(bridgeHandle, storage, this._LOG);

    storage.sliceOpenFromNow(slice);
  },

  searchFolderMessages: function(folderId, bridgeHandle, phrase, whatToSearch) {
    var storage = this._folderStorages[folderId],
        slice = new $searchfilter.SearchSlice(bridgeHandle, storage, phrase,
                                              whatToSearch, this._LOG);
    // the slice is self-starting, we don't need to call anything on storage
  },

  syncFolderList: function asa_syncFolderList(callback) {
    // We can assume that we already have a connection here, since jobs.js
    // ensures it.
    let account = this;

    const fh = $ascp.FolderHierarchy.Tags;
    let w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(fh.FolderSync)
       .tag(fh.SyncKey, this.meta.syncKey)
     .etag();

    this.conn.postCommand(w, function(aError, aResponse) {
      if (aError) {
        callback(aError);
        return;
      }
      let e = new $wbxml.EventParser();
      let deferredAddedFolders = [];

      e.addEventListener([fh.FolderSync, fh.SyncKey], function(node) {
        account.meta.syncKey = node.children[0].textContent;
      });

      e.addEventListener([fh.FolderSync, fh.Changes, [fh.Add, fh.Delete]],
                         function(node) {
        let folder = {};
        for (let [,child] in Iterator(node.children))
          folder[child.localTagName] = child.children[0].textContent;

        if (node.tag === fh.Add) {
          if (!account._addedFolder(folder.ServerId, folder.ParentId,
                                    folder.DisplayName, folder.Type))
            deferredAddedFolders.push(folder);
        }
        else {
          account._deletedFolder(folder.ServerId);
        }
      });

      try {
        e.run(aResponse);
      }
      catch (ex) {
        console.error('Error parsing FolderSync response:', ex, '\n',
                      ex.stack);
        callback('unknown');
        return;
      }

      // It's possible we got some folders in an inconvenient order (i.e. child
      // folders before their parents). Keep trying to add folders until we're
      // done.
      while (deferredAddedFolders.length) {
        let moreDeferredAddedFolders = [];
        for (let [,folder] in Iterator(deferredAddedFolders)) {
          if (!account._addedFolder(folder.ServerId, folder.ParentId,
                                    folder.DisplayName, folder.Type))
            moreDeferredAddedFolders.push(folder);
        }
        if (moreDeferredAddedFolders.length === deferredAddedFolders.length)
          throw new Error('got some orphaned folders');
        deferredAddedFolders = moreDeferredAddedFolders;
      }

      console.log('Synced folder list');
      if (callback)
        callback(null);
    });
  },

  // Map folder type numbers from ActiveSync to Gaia's types
  _folderTypes: {
     1: 'normal', // Generic
     2: 'inbox',  // DefaultInbox
     3: 'drafts', // DefaultDrafts
     4: 'trash',  // DefaultDeleted
     5: 'sent',   // DefaultSent
     6: 'normal', // DefaultOutbox
    12: 'normal', // Mail
  },

  /**
   * Update the internal database and notify the appropriate listeners when we
   * discover a new folder.
   *
   * @param {string} serverId A GUID representing the new folder
   * @param {string} parentServerId A GUID representing the parent folder, or
   *  '0' if this is a root-level folder
   * @param {string} displayName The display name for the new folder
   * @param {string} typeNum A numeric value representing the new folder's type,
   *   corresponding to the mapping in _folderTypes above
   * @param {boolean} suppressNotification (optional) if true, don't notify any
   *   listeners of this addition
   * @return {object} the folderMeta if we added the folder, true if we don't
   *   care about this kind of folder, or null if we need to wait until later
   *   (e.g. if we haven't added the folder's parent yet)
   */
  _addedFolder: function asa__addedFolder(serverId, parentServerId, displayName,
                                          typeNum, suppressNotification) {
    if (!(typeNum in this._folderTypes))
      return true; // Not a folder type we care about.

    const folderType = $ascp.FolderHierarchy.Enums.Type;

    let path = displayName;
    let parentFolderId = null;
    let depth = 0;
    if (parentServerId !== '0') {
      parentFolderId = this._serverIdToFolderId[parentServerId];
      // We haven't learned about the parent folder. Just return, and wait until
      // we do.
      if (parentFolderId === undefined)
        return null;
      let parent = this._folderInfos[parentFolderId];
      path = parent.$meta.path + '/' + path;
      depth = parent.$meta.depth + 1;
    }

    // Handle sentinel Inbox.
    if (typeNum === folderType.DefaultInbox) {
      let existingInboxMeta = this.getFirstFolderWithType('inbox');
      if (existingInboxMeta) {
        // Update the server ID to folder ID mapping.
        delete this._serverIdToFolderId[existingInboxMeta.serverId];
        this._serverIdToFolderId[serverId] = existingInboxMeta.id;

        // Update everything about the folder meta.
        existingInboxMeta.serverId = serverId;
        existingInboxMeta.name = displayName;
        existingInboxMeta.path = path;
        existingInboxMeta.depth = depth;
        return existingInboxMeta;
      }
    }

    let folderId = this.id + '/' + $a64.encodeInt(this.meta.nextFolderNum++);
    let folderInfo = this._folderInfos[folderId] = {
      $meta: {
        id: folderId,
        serverId: serverId,
        name: displayName,
        type: this._folderTypes[typeNum],
        path: path,
        parentId: parentFolderId,
        depth: depth,
        lastSyncedAt: 0,
        syncKey: '0',
      },
      // any changes to the structure here must be reflected in _recreateFolder!
      $impl: {
        nextId: 0,
        nextHeaderBlock: 0,
        nextBodyBlock: 0,
      },
      accuracy: [],
      headerBlocks: [],
      bodyBlocks: [],
      serverIdHeaderBlockMapping: {},
    };

    console.log('Added folder ' + displayName + ' (' + folderId + ')');
    this._folderStorages[folderId] =
      new $mailslice.FolderStorage(this, folderId, folderInfo, this._db,
                                   $asfolder.ActiveSyncFolderSyncer, this._LOG);
    this._serverIdToFolderId[serverId] = folderId;

    let folderMeta = folderInfo.$meta;
    let idx = bsearchForInsert(this.folders, folderMeta, function(a, b) {
      return a.path.localeCompare(b.path);
    });
    this.folders.splice(idx, 0, folderMeta);

    if (!suppressNotification)
      this.universe.__notifyAddedFolder(this, folderMeta);

    return folderMeta;
  },

  /**
   * Update the internal database and notify the appropriate listeners when we
   * find out a folder has been removed.
   *
   * @param {string} serverId A GUID representing the deleted folder
   * @param {boolean} suppressNotification (optional) if true, don't notify any
   *   listeners of this addition
   */
  _deletedFolder: function asa__deletedFolder(serverId, suppressNotification) {
    let folderId = this._serverIdToFolderId[serverId],
        folderInfo = this._folderInfos[folderId],
        folderMeta = folderInfo.$meta;

    console.log('Deleted folder ' + folderMeta.name + ' (' + folderId + ')');
    delete this._serverIdToFolderId[serverId];
    delete this._folderInfos[folderId];
    delete this._folderStorages[folderId];

    var idx = this.folders.indexOf(folderMeta);
    this.folders.splice(idx, 1);

    if (this._deadFolderIds === null)
      this._deadFolderIds = [];
    this._deadFolderIds.push(folderId);

    if (!suppressNotification)
      this.universe.__notifyRemovedFolder(this, folderMeta);
  },

  /**
   * Recreate the folder storage for a particular folder; useful when we end up
   * desyncing with the server and need to start fresh.
   *
   * @param {string} folderId the local ID of the folder
   * @param {function} callback a function to be called when the operation is
   *   complete, taking the new folder storage
   */
  _recreateFolder: function asa__recreateFolder(folderId, callback) {
    this._LOG.recreateFolder(folderId);
    let folderInfo = this._folderInfos[folderId];
    folderInfo.$impl = {
      nextId: 0,
      nextHeaderBlock: 0,
      nextBodyBlock: 0,
    };
    folderInfo.accuracy = [];
    folderInfo.headerBlocks = [];
    folderInfo.bodyBlocks = [];
    folderInfo.serverIdHeaderBlockMapping = {};

    if (this._deadFolderIds === null)
      this._deadFolderIds = [];
    this._deadFolderIds.push(folderId);

    let self = this;
    this.saveAccountState(null, function() {
      let newStorage =
        new $mailslice.FolderStorage(self, folderId, folderInfo, self._db,
                                     $asfolder.ActiveSyncFolderSyncer,
                                     self._LOG);
      for (let [,slice] in Iterator(self._folderStorages[folderId]._slices)) {
        slice._storage = newStorage;
        slice._resetHeadersBecauseOfRefreshExplosion(true);
        newStorage.sliceOpenFromNow(slice);
      }
      self._folderStorages[folderId]._slices = [];
      self._folderStorages[folderId] = newStorage;

      callback(newStorage);
    }, 'recreateFolder');
  },

  /**
   * Create a folder that is the child/descendant of the given parent folder.
   * If no parent folder id is provided, we attempt to create a root folder.
   *
   * @args[
   *   @param[parentFolderId String]
   *   @param[folderName]
   *   @param[containOnlyOtherFolders Boolean]{
   *     Should this folder only contain other folders (and no messages)?
   *     On some servers/backends, mail-bearing folders may not be able to
   *     create sub-folders, in which case one would have to pass this.
   *   }
   *   @param[callback @func[
   *     @args[
   *       @param[error @oneof[
   *         @case[null]{
   *           No error, the folder got created and everything is awesome.
   *         }
   *         @case['offline']{
   *           We are offline and can't create the folder.
   *         }
   *         @case['already-exists']{
   *           The folder appears to already exist.
   *         }
   *         @case['unknown']{
   *           It didn't work and we don't have a better reason.
   *         }
   *       ]]
   *       @param[folderMeta ImapFolderMeta]{
   *         The meta-information for the folder.
   *       }
   *     ]
   *   ]]{
   *   }
   * ]
   */
  createFolder: function asa_createFolder(parentFolderId, folderName,
                                          containOnlyOtherFolders, callback) {
    let account = this;
    if (!this.conn.connected) {
      this.conn.connect(function(error) {
        if (error) {
          callback('unknown');
          return;
        }
        account.createFolder(parentFolderId, folderName,
                             containOnlyOtherFolders, callback);
      });
      return;
    }

    let parentFolderServerId = parentFolderId ?
      this._folderInfos[parentFolderId] : '0';

    const fh = $ascp.FolderHierarchy.Tags;
    const fhStatus = $ascp.FolderHierarchy.Enums.Status;
    const folderType = $ascp.FolderHierarchy.Enums.Type.Mail;

    let w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(fh.FolderCreate)
       .tag(fh.SyncKey, this.meta.syncKey)
       .tag(fh.ParentId, parentFolderServerId)
       .tag(fh.DisplayName, folderName)
       .tag(fh.Type, folderType)
     .etag();

    this.conn.postCommand(w, function(aError, aResponse) {
      let e = new $wbxml.EventParser();
      let status, serverId;

      e.addEventListener([fh.FolderCreate, fh.Status], function(node) {
        status = node.children[0].textContent;
      });
      e.addEventListener([fh.FolderCreate, fh.SyncKey], function(node) {
        account.meta.syncKey = node.children[0].textContent;
      });
      e.addEventListener([fh.FolderCreate, fh.ServerId], function(node) {
        serverId = node.children[0].textContent;
      });

      try {
        e.run(aResponse);
      }
      catch (ex) {
        console.error('Error parsing FolderCreate response:', ex, '\n',
                      ex.stack);
        callback('unknown');
        return;
      }

      if (status === fhStatus.Success) {
        let folderMeta = account._addedFolder(serverId, parentFolderServerId,
                                              folderName, folderType);
        callback(null, folderMeta);
      }
      else if (status === fhStatus.FolderExists) {
        callback('already-exists');
      }
      else {
        callback('unknown');
      }
    });
  },

  /**
   * Delete an existing folder WITHOUT ANY ABILITY TO UNDO IT.  Current UX
   * does not desire this, but the unit tests do.
   *
   * Callback is like the createFolder one, why not.
   */
  deleteFolder: function asa_deleteFolder(folderId, callback) {
    let account = this;
    if (!this.conn.connected) {
      this.conn.connect(function(error) {
        if (error) {
          callback('unknown');
          return;
        }
        account.deleteFolder(folderId, callback);
      });
      return;
    }

    let folderMeta = this._folderInfos[folderId].$meta;

    const fh = $ascp.FolderHierarchy.Tags;
    const fhStatus = $ascp.FolderHierarchy.Enums.Status;
    const folderType = $ascp.FolderHierarchy.Enums.Type.Mail;

    let w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(fh.FolderDelete)
       .tag(fh.SyncKey, this.meta.syncKey)
       .tag(fh.ServerId, folderMeta.serverId)
     .etag();

    this.conn.postCommand(w, function(aError, aResponse) {
      let e = new $wbxml.EventParser();
      let status;

      e.addEventListener([fh.FolderDelete, fh.Status], function(node) {
        status = node.children[0].textContent;
      });
      e.addEventListener([fh.FolderDelete, fh.SyncKey], function(node) {
        account.meta.syncKey = node.children[0].textContent;
      });

      try {

        e.run(aResponse);
      }
      catch (ex) {
        console.error('Error parsing FolderDelete response:', ex, '\n',
                      ex.stack);
        callback('unknown');
        return;
      }

      if (status === fhStatus.Success) {
        account._deletedFolder(folderMeta.serverId);
        callback(null, folderMeta);
      }
      else {
        callback('unknown');
      }
    });
  },

  sendMessage: function asa_sendMessage(composer, callback) {
    let account = this;
    if (!this.conn.connected) {
      this.conn.connect(function(error) {
        if (error) {
          callback('unknown');
          return;
        }
        account.sendMessage(composer, callback);
      });
      return;
    }

    // we want the bcc included because that's how we tell the server the bcc
    // results.
    composer.withMessageBuffer({ includeBcc: true }, function(mimeBuffer) {
      // ActiveSync 14.0 has a completely different API for sending email. Make
      // sure we format things the right way.
      if (this.conn.currentVersion.gte('14.0')) {
        const cm = $ascp.ComposeMail.Tags;
        let w = new $wbxml.Writer('1.3', 1, 'UTF-8');
        w.stag(cm.SendMail)
           .tag(cm.ClientId, Date.now().toString()+'@mozgaia')
           .tag(cm.SaveInSentItems)
           .stag(cm.Mime)
             .opaque(mimeBuffer)
           .etag()
         .etag();

        this.conn.postCommand(w, function(aError, aResponse) {
          if (aError) {
            console.error(aError);
            callback('unknown');
            return;
          }

          if (aResponse === null) {
            console.log('Sent message successfully!');
            callback(null);
          }
          else {
            console.error('Error sending message. XML dump follows:\n' +
                          aResponse.dump());
            callback('unknown');
          }
        });
      }
      else { // ActiveSync 12.x and lower
        this.conn.postData('SendMail', 'message/rfc822',
                           mimeBuffer,
                           function(aError, aResponse) {
          if (aError) {
            console.error(aError);
            callback('unknown');
            return;
          }

          console.log('Sent message successfully!');
          callback(null);
        }, { SaveInSent: 'T' });
      }
    }.bind(this));
  },

  getFolderStorageForFolderId: function asa_getFolderStorageForFolderId(
                               folderId) {
    return this._folderStorages[folderId];
  },

  getFolderStorageForServerId: function asa_getFolderStorageForServerId(
                               serverId) {
    return this._folderStorages[this._serverIdToFolderId[serverId]];
  },

  getFolderMetaForFolderId: function(folderId) {
    if (this._folderInfos.hasOwnProperty(folderId))
      return this._folderInfos[folderId].$meta;
    return null;
  },

  ensureEssentialFolders: function(callback) {
    // XXX I am assuming ActiveSync servers are smart enough to already come
    // with these folders.  If not, we should move IMAP's ensureEssentialFolders
    // into the mixins class.
    if (callback)
      callback();
  },

  scheduleMessagePurge: function(folderId, callback) {
    // ActiveSync servers have no incremental folder growth, so message purging
    // makes no sense for them.
    if (callback)
      callback();
  },

  runOp: $acctmixins.runOp,
  getFirstFolderWithType: $acctmixins.getFirstFolderWithType,
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ActiveSyncAccount: {
    type: $log.ACCOUNT,
    events: {
      createFolder: {},
      deleteFolder: {},
      recreateFolder: { id: false },
      saveAccountState: { reason: false },
    },
    asyncJobs: {
      runOp: { mode: true, type: true, error: false, op: false },
    },
    errors: {
      opError: { mode: false, type: false, ex: $log.EXCEPTION },
    }
  },
});

}); // end define
