define('mailapi/activesync/jobs',
  [
    'wbxml',
    'activesync/codepages',
    'activesync/protocol',
    'rdcommon/log',
    '../jobmixins',
    'module',
    'exports'
  ],
  function(
    $wbxml,
    $ascp,
    $activesync,
    $log,
    $jobmixins,
    $module,
    exports
  ) {
'use strict';

function ActiveSyncJobDriver(account, state, _parentLog) {
  this.account = account;
  // XXX for simplicity for now, let's assume that ActiveSync GUID's are
  // maintained across folder moves.
  this.resilientServerIds = true;
  this._heldMutexReleasers = [];

  this._LOG = LOGFAB.ActiveSyncJobDriver(this, _parentLog, this.account.id);

  this._state = state;
  // (we only need to use one as a proxy for initialization)
  if (!state.hasOwnProperty('suidToServerId')) {
    state.suidToServerId = {};
    state.moveMap = {};
  }

  this._stateDelta = {
    serverIdMap: null,
    moveMap: null,
  };
}
exports.ActiveSyncJobDriver = ActiveSyncJobDriver;
ActiveSyncJobDriver.prototype = {
  //////////////////////////////////////////////////////////////////////////////
  // helpers

  postJobCleanup: $jobmixins.postJobCleanup,

  allJobsDone: $jobmixins.allJobsDone,

  _accessFolderForMutation: function(folderId, needConn, callback, deathback,
                                     label) {
    var storage = this.account.getFolderStorageForFolderId(folderId),
        self = this;
    storage.runMutexed(label, function(releaseMutex) {
      self._heldMutexReleasers.push(releaseMutex);

      var syncer = storage.folderSyncer;
      if (needConn && !self.account.conn.connected) {
        self.account.conn.connect(function(error) {
          try {
            callback(syncer.folderConn, storage);
          }
          catch (ex) {
            self._LOG.callbackErr(ex);
          }
        });
      }
      else {
        try {
          callback(syncer.folderConn, storage);
        }
        catch (ex) {
          self._LOG.callbackErr(ex);
        }
      }
    });
  },

  _partitionAndAccessFoldersSequentially:
    $jobmixins._partitionAndAccessFoldersSequentially,

  //////////////////////////////////////////////////////////////////////////////
  // modtags

  local_do_modtags: $jobmixins.local_do_modtags,

  do_modtags: function(op, jobDoneCallback, undo) {
    // Note: this method is derived from the IMAP implementation.
    let addTags = undo ? op.removeTags : op.addTags,
        removeTags = undo ? op.addTags : op.removeTags;

    function getMark(tag) {
      if (addTags && addTags.indexOf(tag) !== -1)
        return true;
      if (removeTags && removeTags.indexOf(tag) !== -1)
        return false;
      return undefined;
    }

    let markRead = getMark('\\Seen');
    let markFlagged = getMark('\\Flagged');

    const as = $ascp.AirSync.Tags;
    const em = $ascp.Email.Tags;

    let aggrErr = null;

    this._partitionAndAccessFoldersSequentially(
      op.messages, true,
      function perFolder(folderConn, storage, serverIds, namers, callWhenDone) {
        var modsToGo = 0;
        function tagsModded(err) {
          if (err) {
            console.error('failure modifying tags', err);
            aggrErr = 'unknown';
            return;
          }
          op.progress += (undo ? -serverIds.length : serverIds.length);
          if (--modsToGo === 0)
            callWhenDone();
        }

        // Filter out any offline headers, since the server naturally can't do
        // anything for them. If this means we have no headers at all, just bail
        // out.
        serverIds = serverIds.filter(function(srvid) { return !!srvid; });
        if (!serverIds.length) {
          callWhenDone();
          return;
        }

        folderConn.performMutation(
          function withWriter(w) {
            for (let i = 0; i < serverIds.length; i++) {
              w.stag(as.Change)
                 .tag(as.ServerId, serverIds[i])
                 .stag(as.ApplicationData);

              if (markRead !== undefined)
                w.tag(em.Read, markRead ? '1' : '0');

              if (markFlagged !== undefined)
                w.stag(em.Flag)
                   .tag(em.Status, markFlagged ? '2' : '0')
                 .etag();

                w.etag(as.ApplicationData)
             .etag(as.Change);
            }
          },
          function mutationPerformed(err) {
            if (err)
              aggrErr = err;
            callWhenDone();
          });
      },
      function allDone() {
        jobDoneCallback(aggrErr);
      },
      function deadConn() {
        aggrErr = 'aborted-retry';
      },
      /* reverse if we're undoing */ undo,
      'modtags');
  },

  check_modtags: function(op, callback) {
    callback(null, 'idempotent');
  },

  local_undo_modtags: $jobmixins.local_undo_modtags,

  undo_modtags: function(op, callback) {
    this.do_modtags(op, callback, true);
  },

  //////////////////////////////////////////////////////////////////////////////
  // move

  local_do_move: $jobmixins.local_do_move,

  do_move: function(op, jobDoneCallback) {
    /*
     * The ActiveSync command for this does not produce or consume SyncKeys.
     * As such, we don't need to acquire mutexes for the source folders for
     * synchronization correctness, although it is helpful for ordering
     * purposes and reducing confusion.
     *
     * For the target folder a similar logic exists as long as the server-issued
     * GUID's are resilient against folder moves.  However, we do require in
     * all cases that before synchronizing the target folder that we make sure
     * all move operations to the folder have completed so we message doesn't
     * disappear and then show up again. XXX we are not currently enforcing this
     * yet.
     */
    let aggrErr = null, account = this.account,
        targetFolderStorage = this.account.getFolderStorageForFolderId(
                                op.targetFolder);
    const mo = $ascp.Move.Tags;

    this._partitionAndAccessFoldersSequentially(
      op.messages, true,
      function perFolder(folderConn, storage, serverIds, namers, callWhenDone) {
        // Filter out any offline headers, since the server naturally can't do
        // anything for them. If this means we have no headers at all, just bail
        // out.
        serverIds = serverIds.filter(function(srvid) { return !!srvid; });
        if (!serverIds.length) {
          callWhenDone();
          return;
        }

        // Filter out any offline headers, since the server naturally can't do
        // anything for them. If this means we have no headers at all, just bail
        // out.
        serverIds = serverIds.filter(function(srvid) { return !!srvid; });
        if (!serverIds.length) {
          callWhenDone();
          return;
        }

        let w = new $wbxml.Writer('1.3', 1, 'UTF-8');
        w.stag(mo.MoveItems);
        for (let i = 0; i < serverIds.length; i++) {
          w.stag(mo.Move)
             .tag(mo.SrcMsgId, serverIds[i])
             .tag(mo.SrcFldId, storage.folderMeta.serverId)
             .tag(mo.DstFldId, targetFolderStorage.folderMeta.serverId)
           .etag(mo.Move);
        }
        w.etag(mo.MoveItems);

        account.conn.postCommand(w, function(err, response) {
          if (err) {
            aggrErr = err;
            console.error('failure moving messages:', err);
          }
          callWhenDone();
        });
      },
      function allDone() {
        jobDoneCallback(aggrErr, null, true);
      },
      function deadConn() {
        aggrErr = 'aborted-retry';
      },
      false,
      'move');
  },

  check_move: function(op, jobDoneCallback) {

  },

  local_undo_move: $jobmixins.local_undo_move,

  undo_move: function(op, jobDoneCallback) {
  },

  //////////////////////////////////////////////////////////////////////////////
  // delete

  local_do_delete: $jobmixins.local_do_delete,

  do_delete: function(op, jobDoneCallback) {
    let aggrErr = null;
    const as = $ascp.AirSync.Tags;
    const em = $ascp.Email.Tags;

    this._partitionAndAccessFoldersSequentially(
      op.messages, true,
      function perFolder(folderConn, storage, serverIds, namers, callWhenDone) {
        // Filter out any offline headers, since the server naturally can't do
        // anything for them. If this means we have no headers at all, just bail
        // out.
        serverIds = serverIds.filter(function(srvid) { return !!srvid; });
        if (!serverIds.length) {
          callWhenDone();
          return;
        }

        folderConn.performMutation(
          function withWriter(w) {
            for (let i = 0; i < serverIds.length; i++) {
              w.stag(as.Delete)
                 .tag(as.ServerId, serverIds[i])
               .etag(as.Delete);
            }
          },
          function mutationPerformed(err) {
            if (err) {
              aggrErr = err;
              console.error('failure deleting messages:', err);
            }
            callWhenDone();
          });
      },
      function allDone() {
        jobDoneCallback(aggrErr, null, true);
      },
      function deadConn() {
        aggrErr = 'aborted-retry';
      },
      false,
      'delete');
  },

  check_delete: function(op, callback) {
    callback(null, 'idempotent');
  },

  local_undo_delete: $jobmixins.local_undo_delete,

  // TODO implement
  undo_delete: function(op, callback) {
    callback('moot');
  },

  //////////////////////////////////////////////////////////////////////////////
  // syncFolderList
  //
  // Synchronize our folder list.  This should always be an idempotent operation
  // that makes no sense to undo/redo/etc.

  local_do_syncFolderList: function(op, doneCallback) {
    doneCallback(null);
  },

  do_syncFolderList: function(op, doneCallback) {
    var account = this.account, self = this;
    // establish a connection if we are not already connected
    if (!account.conn.connected) {
      account.conn.connect(function(error) {
        if (error) {
          doneCallback('aborted-retry');
          return;
        }
        self.do_syncFolderList(op, doneCallback);
      });
      return;
    }

    // The inbox needs to be resynchronized if there was no server id and we
    // have active slices displaying the contents of the folder.  (No server id
    // means the sync will not happen.)
    var inboxFolder = account.getFirstFolderWithType('inbox'),
        inboxStorage;
    if (inboxFolder && inboxFolder.serverId === null)
      inboxStorage = account.getFolderStorageForFolderId(inboxFolder.id);

    account.syncFolderList(function(err) {
      if (!err)
        account.meta.lastFolderSyncAt = Date.now();
      // save if it worked
      doneCallback(err ? 'aborted-retry' : null, null, !err);

      if (inboxStorage && inboxStorage.hasActiveSlices) {
        if (!err) {
          console.log("Refreshing fake inbox");
          inboxStorage.resetAndRefreshActiveSlices();
        }
        // XXX: If we do have an error here, we should probably report
        // syncfailed on the slices to let the user retry. However, what needs
        // retrying is syncFolderList, not syncing the messages in a folder.
        // Since that's complicated to handle, and syncFolderList will retry
        // automatically, we can ignore that case for now.
      }
    });
  },

  check_syncFolderList: function(op, doneCallback) {
    doneCallback('idempotent');
  },

  local_undo_syncFolderList: function(op, doneCallback) {
    doneCallback('moot');
  },

  undo_syncFolderList: function(op, doneCallback) {
    doneCallback('moot');
  },

  //////////////////////////////////////////////////////////////////////////////
  // download

  local_do_download: $jobmixins.local_do_download,

  do_download: $jobmixins.do_download,

  check_download: $jobmixins.check_download,

  local_undo_download: $jobmixins.local_undo_download,

  undo_download: $jobmixins.undo_download,

  //////////////////////////////////////////////////////////////////////////////
  // purgeExcessMessages is a NOP for activesync

  local_do_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  do_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  check_purgeExcessMessages: function(op, doneCallback) {
    return 'idempotent';
  },

  local_undo_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  undo_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  //////////////////////////////////////////////////////////////////////////////
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ActiveSyncJobDriver: {
    type: $log.DAEMON,
    errors: {
      callbackErr: { ex: $log.EXCEPTION },
    },
  },
});

}); // end define
