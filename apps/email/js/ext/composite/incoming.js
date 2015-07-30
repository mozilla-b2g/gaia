define([
  'logic', '../a64', '../accountmixins', '../mailslice',
  '../searchfilter', '../util', '../db/folder_info_rep', 'require', 'exports'],
  function(logic, $a64, $acctmixins, $mailslice,
  $searchfilter, $util, $folder_info, require, exports) {

var bsearchForInsert = $util.bsearchForInsert;

function cmpFolderPubPath(a, b) {
  return a.path.localeCompare(b.path);
}

/**
 * A base class for IMAP and POP accounts.
 *
 * A lot of the functionality related to handling folders,
 * orchestrating jobs, etc., is common to both IMAP and POP accounts.
 * This class factors out the common functionality, allowing the
 * ImapAccount and Pop3Account classes to only provide
 * protocol-specific code.
 *
 * @param {Class} FolderSyncer The class to instantiate for folder sync.
 *
 * The rest of the parameters match those passed to Pop3Account and
 * ImapAccount.
 */
function CompositeIncomingAccount(
      FolderSyncer,
      universe, compositeAccount, accountId, credentials,
      connInfo, folderInfos, dbConn, existingProtoConn) {

  this.universe = universe;
  this.compositeAccount = compositeAccount;
  this.id = accountId;
  this.accountDef = compositeAccount.accountDef;
  this.enabled = true;
  this._alive = true;
  this._credentials = credentials;
  this._connInfo = connInfo;
  this._db = dbConn;

  // Yes, the pluralization is suspect, but unambiguous.
  /** @dictof[@key[FolderId] @value[FolderStorage] */
  var folderStorages = this._folderStorages = {};
  /** @dictof[@key[FolderId] @value[FolderMeta] */
  var folderPubs = this.folders = [];

  // This is a class, not an instance, hence the camel case.
  this.FolderSyncer = FolderSyncer;

  /**
   * The list of dead folder id's that we need to nuke the storage for when
   * we next save our account status to the database.
   */
  this._deadFolderIds = null;

  /**
   * The canonical folderInfo object we persist to the database.
   */
  this._folderInfos = folderInfos;
  /**
   * @dict[
   *   @param[nextFolderNum Number]{
   *     The next numeric folder number to be allocated.
   *   }
   *   @param[nextMutationNum Number]{
   *     The next mutation id to be allocated.
   *   }
   *   @param[lastFolderSyncAt DateMS]{
   *     When was the last time we ran `syncFolderList`?
   *   }
   *   @param[capability @listof[String]]{
   *     The post-login capabilities from the server.
   *   }
   *   @param[overflowMap @dictof[
   *     @key[uidl String]
   *     @value[@dict[
   *       @key[size Number]
   *     ]]
   *   ]]{
   *     The list of messages that will NOT be downloaded by a sync
   *     automatically, but instead need to be fetched with a "Download
   *     more messages..." operation. (POP3 only.)
   *   }
   *   @param[uidlMap @dictof[
   *     @key[uidl String]
   *     @value[headerID String]
   *   ]]{
   *     A mapping of UIDLs to message header IDs. (POP3 only.)
   *   }
   * ]{
   *   Meta-information about the account derived from probing the account.
   *   This information gets flushed on database upgrades.
   * }
   */
  this.meta = this._folderInfos.$meta;
  /**
   * @listof[SerializedMutation]{
   *   The list of recently issued mutations against us.  Mutations are added
   *   as soon as they are requested and remain until evicted based on a hard
   *   numeric limit.  The limit is driven by our unit tests rather than our
   *   UI which currently only allows a maximum of 1 (high-level) undo.  The
   *   status of whether the mutation has been run is tracked on the mutation
   *   but does not affect its presence or position in the list.
   *
   *   Right now, the `MailUniverse` is in charge of this and we just are a
   *   convenient place to stash the data.
   * }
   */
  this.mutations = this._folderInfos.$mutations;
  for (var folderId in folderInfos) {
    if (folderId[0] === '$')
      continue;
    var folderInfo = folderInfos[folderId];

    folderStorages[folderId] =
      new $mailslice.FolderStorage(this, folderId, folderInfo, this._db,
                                   FolderSyncer);
    folderPubs.push(folderInfo.$meta);
  }
  this.folders.sort(function(a, b) {
    return a.path.localeCompare(b.path);
  });

  // Ensure we have an inbox.  This is a folder that must exist with a standard
  // name, so we can create it without talking to the server.
  var inboxFolder = this.getFirstFolderWithType('inbox');
  if (!inboxFolder) {
    this._learnAboutFolder('INBOX', 'INBOX', null, 'inbox', '/', 0, true);
  }
}
exports.CompositeIncomingAccount = CompositeIncomingAccount;
CompositeIncomingAccount.prototype = {
  ////////////////////////////////////////////////////////////////
  // ACCOUNT OVERRIDES
  runOp: $acctmixins.runOp,
  getFirstFolderWithType: $acctmixins.getFirstFolderWithType,
  getFolderByPath: $acctmixins.getFolderByPath,
  saveAccountState: $acctmixins.saveAccountState,
  runAfterSaves: $acctmixins.runAfterSaves,

  /**
   * Make a given folder known to us, creating state tracking instances, etc.
   *
   * @param {Boolean} suppressNotification
   *   Don't report this folder to subscribed slices.  This is used in cases
   *   where the account has not been made visible to the front-end yet and/or
   *   syncFolderList hasn't yet run, but something subscribed to the "all
   *   accounts" unified folder slice could end up seeing something before it
   *   should.  This is a ret-con'ed comment, so maybe do some auditing before
   *   adding new call-sites that use this, especially if it's not used for
   *   offline-only folders at account creation/app startup.
   */
  _learnAboutFolder: function(name, path, parentId, type, delim, depth,
                              suppressNotification) {
    var folderId = this.id + '/' + $a64.encodeInt(this.meta.nextFolderNum++);
    var folderInfo = this._folderInfos[folderId] = {
      $meta: $folder_info.makeFolderMeta({
        id: folderId,
        name: name,
        type: type,
        path: path,
        parentId: parentId,
        delim: delim,
        depth: depth,
        lastSyncedAt: 0,
        version: $mailslice.FOLDER_DB_VERSION
      }),
      $impl: {
        nextId: 0,
        nextHeaderBlock: 0,
        nextBodyBlock: 0,
      },
      accuracy: [],
      headerBlocks: [],
      bodyBlocks: [],
      serverIdHeaderBlockMapping: null, // IMAP/POP3 does not need the mapping
    };
    this._folderStorages[folderId] =
      new $mailslice.FolderStorage(this, folderId, folderInfo, this._db,
                                   this.FolderSyncer);

    var folderMeta = folderInfo.$meta;
    var idx = bsearchForInsert(this.folders, folderMeta, cmpFolderPubPath);
    this.folders.splice(idx, 0, folderMeta);

    if (!suppressNotification)
      this.universe.__notifyAddedFolder(this, folderMeta);
    return folderMeta;
  },

  _forgetFolder: function(folderId, suppressNotification) {
    var folderInfo = this._folderInfos[folderId],
        folderMeta = folderInfo.$meta;
    delete this._folderInfos[folderId];
    var folderStorage = this._folderStorages[folderId];
    delete this._folderStorages[folderId];
    var idx = this.folders.indexOf(folderMeta);
    this.folders.splice(idx, 1);
    if (this._deadFolderIds === null)
      this._deadFolderIds = [];
    this._deadFolderIds.push(folderId);
    folderStorage.youAreDeadCleanupAfterYourself();

    if (!suppressNotification)
      this.universe.__notifyRemovedFolder(this, folderMeta);
  },

  /**
   * Completely reset the state of a folder.  For use by unit tests and in the
   * case of UID validity rolls.  No notification is generated, although slices
   * are repopulated.
   *
   * FYI: There is a nearly identical method in ActiveSync's account
   * implementation.
   */
  _recreateFolder: function(folderId, callback) {
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

    if (this._deadFolderIds === null)
      this._deadFolderIds = [];
    this._deadFolderIds.push(folderId);

    var self = this;
    this.saveAccountState(null, function() {
      var newStorage =
        new $mailslice.FolderStorage(self, folderId, folderInfo, self._db,
                                     self.FolderSyncer);
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
   * We are being told that a synchronization pass completed, and that we may
   * want to consider persisting our state.
   */
  __checkpointSyncCompleted: function(callback, betterReason) {
    this.saveAccountState(null, callback, betterReason || 'checkpointSync');
  },

  /**
   * Delete an existing folder WITHOUT ANY ABILITY TO UNDO IT. Current
   * UX does not desire this, but the unit tests do.
   *
   * XXX: This is not quite right for POP3; address when we expose
   * deleting folders to the UI when we need to create jobs too.
   *
   * Callback is like the createFolder one, why not.
   */
  deleteFolder: function(folderId, callback) {
    if (!this._folderInfos.hasOwnProperty(folderId))
      throw new Error("No such folder: " + folderId);

    if (!this.universe.online) {
      if (callback)
        callback('offline');
      return;
    }

    var folderMeta = this._folderInfos[folderId].$meta;

    var rawConn = null, self = this;
    function gotConn(conn) {
      rawConn = conn;
      rawConn.delBox(folderMeta.path, deletionCallback);
    }
    function deletionCallback(err) {
      if (err)
        done('unknown');
      else
        done(null);
    }
    function done(errString) {
      if (rawConn) {
        self.__folderDoneWithConnection(rawConn, false, false);
        rawConn = null;
      }
      if (!errString) {
        logic(self, 'deleteFolder', { path: folderMeta.path });
        self._forgetFolder(folderId);
      }
      if (callback)
        callback(errString, folderMeta);
    }
    this.__folderDemandsConnection(null, 'deleteFolder', gotConn);
  },

  getFolderStorageForFolderId: function(folderId) {
    if (this._folderStorages.hasOwnProperty(folderId))
      return this._folderStorages[folderId];
    throw new Error('No folder with id: ' + folderId);
  },

  getFolderStorageForMessageSuid: function(messageSuid) {
    var folderId = messageSuid.substring(0, messageSuid.lastIndexOf('/'));
    if (this._folderStorages.hasOwnProperty(folderId))
      return this._folderStorages[folderId];
    throw new Error('No folder with id: ' + folderId);
  },

  getFolderMetaForFolderId: function(folderId) {
    if (this._folderInfos.hasOwnProperty(folderId))
      return this._folderInfos[folderId].$meta;
    return null;
  },

  /**
   * Create a view slice on the messages in a folder, starting from the most
   * recent messages and synchronizing further as needed.
   */
  sliceFolderMessages: function(folderId, bridgeHandle) {
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

  shutdownFolders: function() {
    // - kill all folder storages (for their loggers)
    for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
      var folderPub = this.folders[iFolder],
          folderStorage = this._folderStorages[folderPub.id];
      folderStorage.shutdown();
    }
  },

  scheduleMessagePurge: function(folderId, callback) {
    this.universe.purgeExcessMessages(this.compositeAccount, folderId,
                                      callback);
  },

  /**
   * We receive this notification from our _backoffEndpoint.
   */
  onEndpointStateChange: function(state) {
    switch (state) {
      case 'healthy':
        this.universe.__removeAccountProblem(this.compositeAccount,
                                             'connection', 'incoming');
        break;
      case 'unreachable':
      case 'broken':
        this.universe.__reportAccountProblem(this.compositeAccount,
                                             'connection', 'incoming');
        break;
    }
  },
};

}); // end define
