/**
 * Implements the ActiveSync protocol for Hotmail and Exchange.
 **/

define(
  [
    'logic',
    '../a64',
    '../accountmixins',
    '../mailslice',
    '../searchfilter',
    // We potentially create the synthetic inbox while offline, so this can't be
    // lazy-loaded.
    'activesync/codepages/FolderHierarchy',
    './folder',
    './jobs',
    '../util',
    '../db/folder_info_rep',
    'module',
    'require',
    'exports'
  ],
  function(
    logic,
    $a64,
    $acctmixins,
    $mailslice,
    $searchfilter,
    $FolderHierarchy,
    $asfolder,
    $asjobs,
    $util,
    $folder_info,
    $module,
    require,
    exports
  ) {
'use strict';

// Lazy loaded vars.
var $wbxml, $asproto, ASCP;

var bsearchForInsert = $util.bsearchForInsert;
var $FolderTypes = $FolderHierarchy.Enums.Type;
var DEFAULT_TIMEOUT_MS = exports.DEFAULT_TIMEOUT_MS = 30 * 1000;

/**
 * Randomly create a unique device id so that multiple devices can independently
 * synchronize without interfering with each other.  Our only goals are to avoid
 * needlessly providing fingerprintable data and avoid collisions with other
 * instances of ourself.  We're using Math.random over crypto.getRandomValues
 * since node does not have the latter right now and predictable values aren't
 * a concern.
 *
 * @return {String} An multi-character ASCII alphanumeric sequence.  (Probably
     10 or 11 digits.)
 */
exports.makeUniqueDeviceId = function() {
  return Math.random().toString(36).substr(2);
};

/**
 * Prototype-helper to wrap a method in a call to withConnection.  This exists
 * largely for historical reasons.  All actual lazy-loading happens within
 * withConnection.
 */
function lazyConnection(cbIndex, fn, failString) {
  return function lazyRun() {
    var args = Array.slice(arguments),
        errback = args[cbIndex],
        self = this;

    this.withConnection(errback, function () {
      fn.apply(self, args);
    }, failString);
  };
}

function ActiveSyncAccount(universe, accountDef, folderInfos, dbConn,
                           receiveProtoConn) {
  this.universe = universe;
  this.id = accountDef.id;
  this.accountDef = accountDef;

  // Transparent upgrade; allocate a device-id if we don't have one.  By doing
  // this we avoid forcing the user to manually re-create the account.  And the
  // current migration system would throw away any saved drafts, which is not
  // desirable.  The common thing in all cases is that we will need to re-sync
  // the folders.
  // XXX remove this upgrade logic when we next compel a version upgrade (and do
  // so safely.)
  if (!accountDef.connInfo.deviceId) {
    accountDef.connInfo.deviceId = exports.makeUniqueDeviceId();
  }

  this._db = dbConn;

  logic.defineScope(this, 'Account', { accountId: this.id,
                                       accountType: 'activesync' });

  if (receiveProtoConn) {
    this.conn = receiveProtoConn;
    this._attachLoggerToConnection(this.conn);
  }
  else {
    this.conn = null;
  }

  this.enabled = true;
  this.problems = [];
  this._alive = true;

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

  // Sync existing folders
  for (var folderId in folderInfos) {
    if (folderId[0] === '$')
      continue;
    var folderInfo = folderInfos[folderId];

    this._folderStorages[folderId] =
      new $mailslice.FolderStorage(this, folderId, folderInfo, this._db,
                                   $asfolder.ActiveSyncFolderSyncer);
    this._serverIdToFolderId[folderInfo.$meta.serverId] = folderId;
    this.folders.push(folderInfo.$meta);
  }

  this.folders.sort(function(a, b) { return a.path.localeCompare(b.path); });

  this._jobDriver = new $asjobs.ActiveSyncJobDriver(
                          this,
                          this._folderInfos.$mutationState);

  // Immediately ensure that we have any required local-only folders,
  // as those can be created even while offline.
  this.ensureEssentialOfflineFolders();

  // Mix in any fields common to all accounts.
  $acctmixins.accountConstructorMixin.call(
    this, /* receivePiece = */ this, /* sendPiece = */ this);
}

exports.Account = exports.ActiveSyncAccount = ActiveSyncAccount;
ActiveSyncAccount.prototype = {
  type: 'activesync',
  supportsServerFolders: true,
  toString: function asa_toString() {
    return '[ActiveSyncAccount: ' + this.id + ']';
  },

  /**
   * Manages connecting, and wiring up initial connection if it is not
   * initialized yet.
   */
  withConnection: function (errback, callback, failString) {
    // lazy load our dependencies if they haven't already been fetched.  This
    // occurs regardless of whether we have a connection already or not.  We
    // do this because the connection may have been passed-in to us as a
    // leftover of the account creation process.
    if (!$wbxml) {
      require(['wbxml', 'activesync/protocol', 'activesync/codepages'],
              function (_wbxml, _asproto, _ASCP) {
        $wbxml = _wbxml;
        $asproto = _asproto;
        ASCP = _ASCP;

        this.withConnection(errback, callback, failString);
      }.bind(this));
      return;
    }

    if (!this.conn) {
      var accountDef = this.accountDef;
      this.conn = new $asproto.Connection(accountDef.connInfo.deviceId);
      this._attachLoggerToConnection(this.conn);
      this.conn.open(accountDef.connInfo.server,
                     accountDef.credentials.username,
                     accountDef.credentials.password);
      this.conn.timeout = DEFAULT_TIMEOUT_MS;
    }

    if (!this.conn.connected) {
      this.conn.connect(function(error) {
        if (error) {
          this._reportErrorIfNecessary(error);
          // If the error was HTTP 401 (bad user/pass), report it as
          // bad-user-or-pass so that account logic like
          // _cmd_clearAccountProblems knows whether or not to report
          // the error as user-serviceable.
          if (this._isBadUserOrPassError(error) && !failString) {
            failString = 'bad-user-or-pass';
          }
          errback(failString || 'unknown');
          return;
        }
        callback();
      }.bind(this));
    } else {
      callback();
    }
  },

  _isBadUserOrPassError: function(error) {
    return (error &&
            error instanceof $asproto.HttpError &&
            error.status === 401);
  },

  /**
   * Reports the error to the user if necessary.
   */
  _reportErrorIfNecessary: function(error) {
    if (!error) {
      return;
    }

    if (this._isBadUserOrPassError(error)) {
      // prompt the user to try a different password
      this.universe.__reportAccountProblem(
        this, 'bad-user-or-pass', 'incoming');
    }
  },


  _attachLoggerToConnection: function(conn) {
    logic.defineScope(conn, 'ActiveSyncConnection',
                      { connectionId: logic.uniqueId() });
    if (!logic.isCensored) {
      conn.onmessage = this._onmessage_dangerous.bind(this, conn);
    } else {
      conn.onmessage = this._onmessage_safe.bind(this, conn);
    }
  },

  /**
   * Basic onmessage ActiveSync protocol logging function.  This does not
   * include user data and is intended for safe circular logging purposes.
   */
  _onmessage_safe: function onmessage(conn,
      type, special, xhr, params, extraHeaders, sentData, response) {
    if (type === 'options') {
      logic(conn, 'options', { special: special,
                               status: xhr.status,
                               response: response });
    }
    else {
      logic(conn, 'command', { type: type,
                               special: special,
                               status: xhr.status });
    }
  },

  /**
   * Dangerous onmessage ActiveSync protocol logging function.  This is
   * intended to log user data for unit testing purposes or very specialized
   * debugging only.
   */
  _onmessage_dangerous: function onmessage(conn,
      type, special, xhr, params, extraHeaders, sentData, response) {
    if (type === 'options') {
      logic(conn, 'options', { special: special,
                               status: xhr.status,
                               response: response });
    }
    else {
      var sentXML, receivedXML;
      if (sentData) {
        try {
          var sentReader = new $wbxml.Reader(new Uint8Array(sentData), ASCP);
          sentXML = sentReader.dump();
        }
        catch (ex) {
          sentXML = 'parse problem';
        }
      }
      if (response) {
        try {
          receivedXML = response.dump();
          response.rewind();
        }
        catch (ex) {
          receivedXML = 'parse problem';
        }
      }

      logic(conn, 'command', { type: type,
                               special: special,
                               status: xhr.status,
                               params: params,
                               extraHeaders: extraHeaders,
                               sentXML: sentXML,
                               receivedXML: receivedXML });
    }
  },

  toBridgeWire: function asa_toBridgeWire() {
    return {
      id: this.accountDef.id,
      name: this.accountDef.name,
      path: this.accountDef.name,
      type: this.accountDef.type,

      defaultPriority: this.accountDef.defaultPriority,

      enabled: this.enabled,
      problems: this.problems,

      syncRange: this.accountDef.syncRange,
      syncInterval: this.accountDef.syncInterval,
      notifyOnNew: this.accountDef.notifyOnNew,
      playSoundOnSend: this.accountDef.playSoundOnSend,

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

  /**
   * Check that the account is healthy in that we can login at all.
   */
  checkAccount: function(callback) {
    // disconnect first so as to properly check credentials
    if (this.conn != null) {
      if (this.conn.connected) {
        this.conn.disconnect();
      }
      this.conn = null;
    }
    this.withConnection(function(err) {
      callback(err);
    }, function() {
      callback();
    });
  },

  /**
   * We are being told that a synchronization pass completed, and that we may
   * want to consider persisting our state.
   */
  __checkpointSyncCompleted: function(callback, betterReason) {
    this.saveAccountState(null, callback, betterReason || 'checkpointSync');
  },

  shutdown: function asa_shutdown(callback) {
    if (callback)
      callback();
  },

  accountDeleted: function asa_accountDeleted() {
    this._alive = false;
    this.shutdown();
  },

  sliceFolderMessages: function asa_sliceFolderMessages(folderId,
                                                        bridgeHandle) {
    var storage = this._folderStorages[folderId],
        slice = new $mailslice.MailSlice(bridgeHandle, storage);

    storage.sliceOpenMostRecent(slice);
  },

  searchFolderMessages: function(folderId, bridgeHandle, phrase, whatToSearch) {
    var storage = this._folderStorages[folderId],
        slice = new $searchfilter.SearchSlice(bridgeHandle, storage, phrase,
                                              whatToSearch);
    storage.sliceOpenSearch(slice);
    return slice;
  },

  syncFolderList: lazyConnection(0, function asa_syncFolderList(callback) {
    var account = this;

    var fh = ASCP.FolderHierarchy.Tags;
    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(fh.FolderSync)
       .tag(fh.SyncKey, this.meta.syncKey)
     .etag();

    this.conn.postCommand(w, function(aError, aResponse) {
      if (aError) {
        account._reportErrorIfNecessary(aError);
        callback(aError);
        return;
      }
      var e = new $wbxml.EventParser();
      var deferredAddedFolders = [];

      e.addEventListener([fh.FolderSync, fh.SyncKey], function(node) {
        account.meta.syncKey = node.children[0].textContent;
      });

      e.addEventListener([fh.FolderSync, fh.Changes, [fh.Add, fh.Delete]],
                         function(node) {
        var folder = {};
        for (var iter in Iterator(node.children)) {
          var child = iter[1];
          folder[child.localTagName] = child.children[0].textContent;
        }

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
        var moreDeferredAddedFolders = [];
        for (var iter in Iterator(deferredAddedFolders)) {
          var folder = iter[1];
          if (!account._addedFolder(folder.ServerId, folder.ParentId,
                                    folder.DisplayName, folder.Type))
            moreDeferredAddedFolders.push(folder);
        }
        if (moreDeferredAddedFolders.length === deferredAddedFolders.length)
          throw new Error('got some orphaned folders');
        deferredAddedFolders = moreDeferredAddedFolders;
      }

      // Once we've synchonized the folder list, kick off another job
      // to check that we have all essential online folders. Once that
      // completes, we'll check to make sure our offline-only folders
      // (localdrafts, outbox) are in the right place according to
      // where this server stores other built-in folders.
      account.ensureEssentialOnlineFolders();
      account.normalizeFolderHierarchy();

      console.log('Synced folder list');
      callback && callback(null);
    });
  }),

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
   * List of known junk folder names, taken from browserbox.js, and used to
   * infer folders that are junk folders based on their name since there is
   * no enumerated type representing junk folders.
   */
  _junkFolderNames: [
    'bulk mail', 'correo no deseado', 'courrier indésirable', 'istenmeyen',
    'istenmeyen e-posta', 'junk', 'levélszemét', 'nevyžiadaná pošta',
    'nevyžádaná pošta', 'no deseado', 'posta indesiderata', 'pourriel',
    'roskaposti', 'skräppost', 'spam', 'spamowanie', 'søppelpost',
    'thư rác', 'спам', 'דואר זבל', 'الرسائل العشوائية', 'هرزنامه', 'สแปม',
    '垃圾郵件', '垃圾邮件', '垃圾電郵'],

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
   * @param {string} forceType Force a string folder type for this folder.
   *   Used for synthetic folders like localdrafts.
   * @param {boolean} suppressNotification (optional) if true, don't notify any
   *   listeners of this addition
   * @return {object} the folderMeta if we added the folder, true if we don't
   *   care about this kind of folder, or null if we need to wait until later
   *   (e.g. if we haven't added the folder's parent yet)
   */
  _addedFolder: function asa__addedFolder(serverId, parentServerId, displayName,
                                          typeNum, forceType,
                                          suppressNotification) {
    if (!forceType && !(typeNum in this._folderTypes))
      return true; // Not a folder type we care about.

    var path = displayName;
    var parentFolderId = null;
    var depth = 0;
    if (parentServerId !== '0') {
      parentFolderId = this._serverIdToFolderId[parentServerId];
      // We haven't learned about the parent folder. Just return, and wait until
      // we do.
      if (parentFolderId === undefined)
        return null;
      var parent = this._folderInfos[parentFolderId];
      path = parent.$meta.path + '/' + path;
      depth = parent.$meta.depth + 1;
    }

    var useFolderType = this._folderTypes[typeNum];
    // Check if this looks like a junk folder based on its name/path.  (There
    // is no type for junk/spam folders, so this regrettably must be inferred
    // from the name.  At least for hotmail.com/outlook.com, it appears that
    // the name is "Junk" regardless of the locale in which the account is
    // created, but our current datapoint is one account created using the
    // Spanish locale.
    //
    // In order to avoid bad detections, we assume that the junk folder is
    // at the top-level or is only nested one level deep.
    if (depth < 2) {
      var normalizedName = displayName.toLowerCase();
      if (this._junkFolderNames.indexOf(normalizedName) !== -1) {
        useFolderType = 'junk';
      }
    }
    if (forceType) {
      useFolderType = forceType;
    }


    // Handle sentinel Inbox.
    if (typeNum === $FolderTypes.DefaultInbox) {
      var existingInboxMeta = this.getFirstFolderWithType('inbox');
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

    var folderId = this.id + '/' + $a64.encodeInt(this.meta.nextFolderNum++);
    var folderInfo = this._folderInfos[folderId] = {
      $meta: $folder_info.makeFolderMeta({
        id: folderId,
        serverId: serverId,
        name: displayName,
        type: useFolderType,
        path: path,
        parentId: parentFolderId,
        depth: depth,
        lastSyncedAt: 0,
        syncKey: '0',
        version: $mailslice.FOLDER_DB_VERSION
      }),
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
                                   $asfolder.ActiveSyncFolderSyncer);
    this._serverIdToFolderId[serverId] = folderId;

    var folderMeta = folderInfo.$meta;
    var idx = bsearchForInsert(this.folders, folderMeta, function(a, b) {
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
    var folderId = this._serverIdToFolderId[serverId],
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
   * desyncing with the server and need to start fresh.  No notification is
   * generated, although slices are repopulated.
   *
   * FYI: There is a nearly identical method in IMAP's account implementation.
   *
   * @param {string} folderId the local ID of the folder
   * @param {function} callback a function to be called when the operation is
   *   complete, taking the new folder storage
   */
  _recreateFolder: function asa__recreateFolder(folderId, callback) {
    logic(this, 'recreateFolder', { folderId: folderId });
    var folderInfo = this._folderInfos[folderId];
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

    var self = this;
    this.saveAccountState(null, function() {
      var newStorage =
        new $mailslice.FolderStorage(self, folderId, folderInfo, self._db,
                                     $asfolder.ActiveSyncFolderSyncer);
      for (var iter in Iterator(self._folderStorages[folderId]._slices)) {
        var slice = iter[1];
        slice._storage = newStorage;
        slice.reset();
        newStorage.sliceOpenMostRecent(slice);
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
   * NOTE: This function is currently unused.  It might have been used for
   * testing at some point.  It will be used again someday but should not be
   * assumed to actually work when that day comes.
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
  createFolder: lazyConnection(3, function asa_createFolder(parentFolderId,
                                                      folderName,
                                                      containOnlyOtherFolders,
                                                      callback) {
    var account = this;

    var parentFolderServerId = parentFolderId ?
      this._folderInfos[parentFolderId] : '0';

    var fh = ASCP.FolderHierarchy.Tags;
    var fhStatus = ASCP.FolderHierarchy.Enums.Status;
    var folderType = ASCP.FolderHierarchy.Enums.Type.Mail;

    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(fh.FolderCreate)
       .tag(fh.SyncKey, this.meta.syncKey)
       .tag(fh.ParentId, parentFolderServerId)
       .tag(fh.DisplayName, folderName)
       .tag(fh.Type, folderType)
     .etag();

    this.conn.postCommand(w, function(aError, aResponse) {
      account._reportErrorIfNecessary(aError);

      var e = new $wbxml.EventParser();
      var status, serverId;

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
        var folderMeta = account._addedFolder(serverId, parentFolderServerId,
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
  }),

  /**
   * Delete an existing folder WITHOUT ANY ABILITY TO UNDO IT.  Current UX
   * does not desire this, but the unit tests do.
   *
   * Callback is like the createFolder one, why not.
   */
  deleteFolder: lazyConnection(1, function asa_deleteFolder(folderId,
                                                            callback) {
    var account = this;

    var folderMeta = this._folderInfos[folderId].$meta;

    var fh = ASCP.FolderHierarchy.Tags;
    var fhStatus = ASCP.FolderHierarchy.Enums.Status;
    var folderType = ASCP.FolderHierarchy.Enums.Type.Mail;

    var w = new $wbxml.Writer('1.3', 1, 'UTF-8');
    w.stag(fh.FolderDelete)
       .tag(fh.SyncKey, this.meta.syncKey)
       .tag(fh.ServerId, folderMeta.serverId)
     .etag();

    this.conn.postCommand(w, function(aError, aResponse) {
      account._reportErrorIfNecessary(aError);

      var e = new $wbxml.EventParser();
      var status;

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
  }),

  sendMessage: lazyConnection(1, function asa_sendMessage(composer, callback) {
    var account = this;

    // we want the bcc included because that's how we tell the server the bcc
    // results.
    composer.withMessageBlob({ includeBcc: true }, function(mimeBlob) {
      // ActiveSync 14.0 has a completely different API for sending email. Make
      // sure we format things the right way.
      if (this.conn.currentVersion.gte('14.0')) {
        var cm = ASCP.ComposeMail.Tags;
        var w = new $wbxml.Writer('1.3', 1, 'UTF-8', null, 'blob');
        w.stag(cm.SendMail)
           // The ClientId is defined to be for duplicate messages suppression
           // and does not need to have any uniqueness constraints apart from
           // not being similar to (recently sent) messages by this client.
           .tag(cm.ClientId, Date.now().toString()+'@mozgaia')
           .tag(cm.SaveInSentItems)
           .stag(cm.Mime)
             .opaque(mimeBlob)
           .etag()
         .etag();

        this.conn.postCommand(w, function(aError, aResponse) {
          if (aError) {
            account._reportErrorIfNecessary(aError);
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
        }, /* aExtraParams = */ null, /* aExtraHeaders = */ null,
          /* aProgressCallback = */ function() {
          // Keep holding the wakelock as we continue sending.
          composer.renewSmartWakeLock('ActiveSync XHR Progress');
        });
      }
      else { // ActiveSync 12.x and lower
        this.conn.postData('SendMail', 'message/rfc822', mimeBlob,
                           function(aError, aResponse) {
          if (aError) {
            account._reportErrorIfNecessary(aError);
            console.error(aError);
            callback('unknown');
            return;
          }

          console.log('Sent message successfully!');
          callback(null);
        }, { SaveInSent: 'T' }, /* aExtraHeaders = */ null,
          /* aProgressCallback = */ function() {
          // Keep holding the wakelock as we continue sending.
          composer.renewSmartWakeLock('ActiveSync XHR Progress');
        });
      }
    }.bind(this));
  }),

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

  /**
   * Ensure that local-only folders exist. This runs synchronously
   * before we sync the folder list with the server. Ideally, these
   * folders should reside in a proper place in the folder hierarchy,
   * which may differ between servers depending on whether the
   * account's other folders live underneath the inbox or as
   * top-level-folders. But since moving folders is easy and doesn't
   * really affect the backend, we'll just ensure they exist here, and
   * fix up their hierarchical location when syncing the folder list.
   */
  ensureEssentialOfflineFolders: function() {
    // On folder type numbers: While there are enum values for outbox
    // and drafts, they represent server-side default folders, not the
    // local folders we create for ourselves, so they must be created
    // with an unknown typeNum.
    [{
      type: 'inbox',
      displayName: 'Inbox', // Intentionally title-case.
      typeNum: $FolderTypes.DefaultInbox,
    }, {
      type: 'outbox',
      displayName: 'outbox',
      typeNum: $FolderTypes.Unknown, // There is no "local outbox" typeNum.
    }, {
      type: 'localdrafts',
      displayName: 'localdrafts',
      typeNum: $FolderTypes.Unknown, // There is no "localdrafts" typeNum.
    }].forEach(function(data) {
      if (!this.getFirstFolderWithType(data.type)) {
        this._addedFolder(
          /* serverId: */ null,
          /* parentServerId: */ '0',
          /* displayName: */ data.displayName,
          /* typeNum: */ data.typeNum,
          /* forceType: */ data.type,
          /* suppressNotification: */ true);
      }
    }, this);
  },

  /**
   * Kick off jobs to create essential folders (sent, trash) if
   * necessary. These folders should be created on both the client and
   * the server; contrast with `ensureEssentialOfflineFolders`.
   *
   * TODO: Support localizing all automatically named e-mail folders
   * regardless of the origin locale.
   * Relevant bugs: <https://bugzil.la/905869>, <https://bugzil.la/905878>.
   *
   * @param {function} callback
   *   Called when all ops have run.
   */
  ensureEssentialOnlineFolders: function(callback) {
    // Our ActiveSync implementation currently assumes that all
    // ActiveSync servers always come with Sent and Trash folders. If
    // that assumption proves false, we'd add them here like IMAP.
    callback && callback();
  },

  /**
   * Ensure that local-only folders live in a reasonable place in the
   * folder hierarchy by moving them if necessary.
   *
   * We proactively create local-only folders at the root level before
   * we synchronize with the server; if possible, we want these
   * folders to reside as siblings to other system-level folders on
   * the account. This is called at the end of syncFolderList, after
   * we have learned about all existing server folders.
   */
  normalizeFolderHierarchy: $acctmixins.normalizeFolderHierarchy,

  scheduleMessagePurge: function(folderId, callback) {
    // ActiveSync servers have no incremental folder growth, so message purging
    // makes no sense for them.
    if (callback)
      callback();
  },

  upgradeFolderStoragesIfNeeded: $acctmixins.upgradeFolderStoragesIfNeeded,
  runOp: $acctmixins.runOp,
  getFirstFolderWithType: $acctmixins.getFirstFolderWithType,
  getFolderByPath: $acctmixins.getFolderByPath,
  saveAccountState: $acctmixins.saveAccountState,
  runAfterSaves: $acctmixins.runAfterSaves,

  allOperationsCompleted: function() {
  }
};

}); // end define
