define(['module', 'exports', 'logic', '../allback', 'mix',
        '../jobmixins', '../drafts/jobs', './pop3'],
       function(module, exports, logic, allback, mix,
                jobmixins, draftsJobs, pop3) {

/**
 * Manage the jobs for a POP3 account. POP3 does not support
 * server-side folders, so many of these operations are local-only.
 * Operations not implemented in the Pop3JobDriver are ignored and
 * assumed unsupported. For instance, issuing a "move" command will
 * execute local_do_move, but not do_move. It is assumed that unit
 * tests will ensure we've implemented all required jobs.
 */
function Pop3JobDriver(account, state) {
  this.account = account;
  this.resilientServerIds = true; // once assigned, the server never changes IDs
  this._heldMutexReleasers = [];

  logic.defineScope(this, 'Pop3JobDriver', { accountId: account.id });

  // For tracking state as used in jobmixins:
  this._stateDelta = {};
  this._state = state;
  if (!state.hasOwnProperty('suidToServerId')) {
    state.suidToServerId = {};
    state.moveMap = {};
  }
}
exports.Pop3JobDriver = Pop3JobDriver;
Pop3JobDriver.prototype = {

  /**
   * Request access to a POP3 folder for mutation. This acquires a
   * write mutex on the FolderStorage. The callback will be invoked
   * with the folder and the raw connection.
   *
   * There is no need to explicitly release the connection when done;
   * it will be automatically released when the mutex is released if
   * desirable.
   *
   * This function is used by jobmixins.
   */
  _accessFolderForMutation: function(
      folderId, needConn, callback, deathback, label) {
    var storage = this.account.getFolderStorageForFolderId(folderId);
    storage.runMutexed(label, function(releaseMutex) {
      this._heldMutexReleasers.push(releaseMutex);
      try {
        // The folderSyncer is like IMAP/ActiveSync's folderConn.
        callback(storage.folderSyncer, storage);
      } catch (ex) {
        logic(this, 'callbackErr', { ex: ex });
      }
    }.bind(this));
  },

  /**
   * Create a folder locally. (Again, no remote folders, so
   * do_createFolder is not implemented.)
   */
  local_do_createFolder: function(op, callback) {
    var path, delim, parentFolderId = null, depth = 0;

    if (op.parentFolderId) {
      if (!this.account._folderInfos.hasOwnProperty(op.parentFolderId)) {
        throw new Error("No such folder: " + op.parentFolderId);
      }
      var parentFolder = this.account._folderInfos[op.parentFolderId];
      delim = parentFolder.$meta.delim;
      path = parentFolder.$meta.path + delim;
      parentFolderId = parentFolder.$meta.id;
      depth = parentFolder.depth + 1;
    }
    else {
      path = '';
      delim = '/';
    }

    if (typeof(op.folderName) === 'string')
      path += op.folderName;
    else
      path += op.folderName.join(delim);
    if (op.containOnlyOtherFolders) {
      path += delim;
    }

    if (this.account.getFolderByPath(path)) {
      callback(null);
    } else {
      var folderMeta = self.account._learnAboutFolder(
          op.folderName, path, parentFolderId, 'normal', delim, depth);
      callback(null, folderMeta);
    }
  },

  /**
   * Delete old messages from disk. Since we currently leave mail on
   * the server, we won't incur permanent data loss.
   */
  local_do_purgeExcessMessages: function(op, callback) {
    this._accessFolderForMutation(
      op.folderId, false,
      function withMutex(_ignoredConn, storage) {
        storage.purgeExcessMessages(function(numDeleted, cutTS) {
          // Indicate that we want a save performed if any messages got deleted.
          callback(null, null, numDeleted > 0);
        });
      },
      null,
      'purgeExcessMessages');
  },

  local_do_saveSentDraft: function(op, callback) {
    var self = this;
    this._accessFolderForMutation(
      op.folderId, /* needConn*/ false,
      function(nullFolderConn, folderStorage) {
        var latch = allback.latch();

        folderStorage.addMessageHeader(op.headerInfo, op.bodyInfo,
                                       latch.defer());
        folderStorage.addMessageBody(op.headerInfo, op.bodyInfo, latch.defer());

        latch.then(function(results) {
          // header/body insertion can't fail
          callback(null, null, /* save */ true);
        });
      },
      /* no conn => no deathback required */ null,
      'saveSentDraft');
  },

  do_syncFolderList: function(op, doneCallback) {
    this.account.meta.lastFolderSyncAt = Date.now();
    doneCallback(null);
  },

  /** No-op to silence warnings. Perhaps implement someday. */
  do_modtags: function(op, doneCallback) {
    doneCallback(null);
  },

  /** No-op to silence warnings. Perhaps implement someday. */
  undo_modtags: function(op, doneCallback) {
    doneCallback(null);
  },

  // Local modifications (move, delete, and modtags) simply reuse the
  // jobmixins implementation. No server-side implementations are
  // necessary here, so they are omitted.
  local_do_modtags: jobmixins.local_do_modtags,
  local_undo_modtags: jobmixins.local_undo_modtags,
  local_do_move: jobmixins.local_do_move,
  local_undo_move: jobmixins.local_undo_move,
  local_do_delete: jobmixins.local_do_delete,
  local_undo_delete: jobmixins.local_undo_delete,

  // Download operations (for attachments) are irrelevant because
  // downloading the bodies always fetches the attachments too.

  local_do_downloadBodies: jobmixins.local_do_downloadBodies,
  do_downloadBodies: jobmixins.do_downloadBodies,
  check_downloadBodies: jobmixins.check_downloadBodies,

  check_downloadBodyReps: jobmixins.check_downloadBodyReps,
  do_downloadBodyReps: jobmixins.do_downloadBodyReps,
  local_do_downloadBodyReps: jobmixins.local_do_downloadBodyReps,


  local_do_sendOutboxMessages: jobmixins.local_do_sendOutboxMessages,
  do_sendOutboxMessages: jobmixins.do_sendOutboxMessages,
  check_sendOutboxMessages: jobmixins.check_sendOutboxMessages,
  local_undo_sendOutboxMessages: jobmixins.local_undo_sendOutboxMessages,
  undo_sendOutboxMessages: jobmixins.undo_sendOutboxMessages,
  local_do_setOutboxSyncEnabled: jobmixins.local_do_setOutboxSyncEnabled,

  local_do_upgradeDB: jobmixins.local_do_upgradeDB,

  // These utility functions are necessary.
  postJobCleanup: jobmixins.postJobCleanup,
  allJobsDone: jobmixins.allJobsDone,
  _partitionAndAccessFoldersSequentially:
      jobmixins._partitionAndAccessFoldersSequentially
};

mix(Pop3JobDriver.prototype, draftsJobs.draftsMixins);

}); // end define
