/**
 * Mix-ins for account job functionality where the code is reused.
 **/

define(
  [
    './worker-router',
    './util',
    './allback',
    './wakelocks',
    './date',
    './syncbase',
    './mailslice',
    './headerCounter',
    'logic',
    'exports',
    'require'
  ],
  function(
    $router,
    $util,
    $allback,
    $wakelocks,
    $date,
    $sync,
    $mailslice,
    $count,
    logic,
    exports,
    require
  ) {

var sendMessage = $router.registerCallbackType('devicestorage');

exports.local_do_modtags = function(op, doneCallback, undo) {
  var self = this;
  var addTags = undo ? op.removeTags : op.addTags,
      removeTags = undo ? op.addTags : op.removeTags;
  var mutationsPerformed = 0;
  this._partitionAndAccessFoldersSequentially(
    op.messages,
    false,
    function perFolder(ignoredConn, storage, headers, namers, callWhenDone) {
      var waitingOn = headers.length;
      function next() {
        if (--waitingOn === 0)
          callWhenDone();
      }
      for (var iHeader = 0; iHeader < headers.length; iHeader++) {
        var header = headers[iHeader];
        var iTag, tag, existing, modified = false;
        if (addTags) {
          for (iTag = 0; iTag < addTags.length; iTag++) {
            tag = addTags[iTag];
            // The list should be small enough that native stuff is better
            // than JS bsearch.
            existing = header.flags.indexOf(tag);
            if (existing !== -1)
              continue;
            header.flags.push(tag);
            mutationsPerformed++;
            if (tag === '\\Seen') {
              storage.folderMeta.unreadCount--;
            }
            header.flags.sort(); // (maintain sorted invariant)
            modified = true;
          }
        }
        if (removeTags) {
          for (iTag = 0; iTag < removeTags.length; iTag++) {
            tag = removeTags[iTag];
            existing = header.flags.indexOf(tag);
            if (existing === -1)
              continue;
            header.flags.splice(existing, 1);
            mutationsPerformed++;
            if (tag === '\\Seen') {
              storage.folderMeta.unreadCount++;
            }
            modified = true;
          }
        }
        storage.updateMessageHeader(header.date, header.id, false,
                                    header, /* body hint */ null, next);
      }
    },
    function() {
      // If we didn't actually do anything, then we don't actually need to do
      // anything on the server either and we can skip it.
      //
      // Note that this does get us into some edge cases around the semantics of
      // undo.  Before this change, "undo" always just meant "do the opposite
      // modification of what I said" which is notably different from "undo the
      // things you actually just did" which gave rise to the (currently
      // unfixed) https://bugzil.la/997496.  And so with this change, we'll do
      // the "right" thing, but in other cases we'll still do the "wrong" thing.
      if (mutationsPerformed === 0) {
        op.serverStatus = 'skip';
      }
      doneCallback(null, null, true);
    },
    null, // connection loss does not happen for local-only ops
    undo,
    'modtags');
};

exports.local_undo_modtags = function(op, callback) {
  // Undoing is just a question of flipping the add and remove lists.
  return this.local_do_modtags(op, callback, true);
};


exports.local_do_move = function(op, doneCallback, targetFolderId) {
  // create a scratch field to store the guid's for check purposes
  op.guids = {};
  var nukeServerIds = !this.resilientServerIds;

  var stateDelta = this._stateDelta, addWait = 0, self = this;
  if (!stateDelta.moveMap)
    stateDelta.moveMap = {};
  if (!stateDelta.serverIdMap)
    stateDelta.serverIdMap = {};
  if (!targetFolderId)
    targetFolderId = op.targetFolder;

  this._partitionAndAccessFoldersSequentially(
    op.messages, false,
    function perFolder(ignoredConn, sourceStorage, headers, namers,
                       perFolderDone) {
      // -- open the target folder for processing
      function targetOpened_nowProcess(ignoredConn, _targetStorage) {
        targetStorage = _targetStorage;
        processNext();
      }
      // -- get the body for the next header (or be done)
      function processNext() {
        if (iNextHeader >= headers.length) {
          perFolderDone();
          return;
        }
        header = headers[iNextHeader++];
        sourceStorage.getMessageBody(header.suid, header.date,
                                     gotBody_nowDelete);
      }
      // -- delete the header and body from the source
      function gotBody_nowDelete(_body) {
        body = _body;

        // We need an entry in the server id map if we are moving/deleting it.
        // We don't need this if we're moving a message to the folder it's
        // already in, but it doesn't hurt anything.
        if (header.srvid)
          stateDelta.serverIdMap[header.suid] = header.srvid;

        if (sourceStorage === targetStorage ||
            // localdraft messages aren't real, and so must not be
            // moved and are only eligible for nuke deletion. But they
            // _can_ be moved to the outbox, and vice versa!
            (sourceStorage.folderMeta.type === 'localdrafts' &&
             targetStorage.folderMeta.type !== 'outbox') ||
            (sourceStorage.folderMeta.type === 'outbox' &&
             targetStorage.folderMeta.type !== 'localdrafts')) {
          if (op.type === 'move') {
            // A move from a folder to itself is a no-op.
            processNext();
          }
          else { // op.type === 'delete'
            // If the op is a delete and the source and destination folders
            // match, we're deleting from trash, so just perma-delete it.
            sourceStorage.deleteMessageHeaderAndBodyUsingHeader(
              header, processNext);
          }
        }
        else {
          sourceStorage.deleteMessageHeaderAndBodyUsingHeader(
            header, deleted_nowAdd);
        }
      }
      // -- add the header/body to the target folder
      function deleted_nowAdd() {
        var sourceSuid = header.suid;

        // - update id fields
        header.id = targetStorage._issueNewHeaderId();
        header.suid = targetStorage.folderId + '/' + header.id;
        if (nukeServerIds)
          header.srvid = null;

        stateDelta.moveMap[sourceSuid] = header.suid;
        addWait = 2;
        targetStorage.addMessageHeader(header, body, added);
        targetStorage.addMessageBody(header, body, added);
      }
      function added() {
        if (--addWait !== 0)
          return;
        processNext();
      }
      var iNextHeader = 0, targetStorage = null, header = null, body = null,
          addWait = 0;

      // If the source folder and the target folder are the same, don't try
      // to access the target folder!
      if (sourceStorage.folderId === targetFolderId) {
        targetStorage = sourceStorage;
        processNext();
      }
      else {
        self._accessFolderForMutation(targetFolderId, false,
                                      targetOpened_nowProcess, null,
                                      'local move target');
      }
    },
    function() {
      // Pass along the moveMap as the move's result, so that the
      // frontend can directly obtain a reference to the moved
      // message. This is used when tapping a message in the outbox
      // folder (wherein we expect it to be moved to localdrafts and
      // immediately edited).
      doneCallback(null, stateDelta.moveMap, true);
    },
    null, // connection loss does not happen for local-only ops
    false,
    'local move source');
};

// XXX implement!
exports.local_undo_move = function(op, doneCallback, targetFolderId) {
  doneCallback(null);
};

exports.local_do_delete = function(op, doneCallback) {
  var trashFolder = this.account.getFirstFolderWithType('trash');
  if (!trashFolder) {
    this.account.ensureEssentialOnlineFolders();
    doneCallback('defer');
    return;
  }
  this.local_do_move(op, doneCallback, trashFolder.id);
};

exports.local_undo_delete = function(op, doneCallback) {
  var trashFolder = this.account.getFirstFolderWithType('trash');
  if (!trashFolder) {
    // the absence of the trash folder when it must have previously existed is
    // confusing.
    doneCallback('unknown');
    return;
  }
  this.local_undo_move(op, doneCallback, trashFolder.id);
};

exports.do_download = function(op, callback) {
  var self = this;
  var idxLastSlash = op.messageSuid.lastIndexOf('/'),
      folderId = op.messageSuid.substring(0, idxLastSlash);

  var folderConn, folderStorage;
  // Once we have the connection, get the current state of the body rep.
  var gotConn = function gotConn(_folderConn, _folderStorage) {
    folderConn = _folderConn;
    folderStorage = _folderStorage;

    folderStorage.getMessageHeader(op.messageSuid, op.messageDate, gotHeader);
  };
  var deadConn = function deadConn() {
    callback('aborted-retry');
  };
  // Now that we have the body, we can know the part numbers and eliminate /
  // filter out any redundant download requests.  Issue all the fetches at
  // once.
  var partsToDownload = [], storePartsTo = [], registerDownload = [],
      header, bodyInfo, uid;
  var gotHeader = function gotHeader(_headerInfo) {
    header = _headerInfo;
    uid = header.srvid;
    folderStorage.getMessageBody(op.messageSuid, op.messageDate, gotBody);
  };
  var gotBody = function gotBody(_bodyInfo) {
    bodyInfo = _bodyInfo;
    var i, partInfo;
    for (i = 0; i < op.relPartIndices.length; i++) {
      partInfo = bodyInfo.relatedParts[op.relPartIndices[i]];
      if (partInfo.file)
        continue;
      partsToDownload.push(partInfo);
      storePartsTo.push('idb');
      registerDownload.push(false);
    }
    for (i = 0; i < op.attachmentIndices.length; i++) {
      partInfo = bodyInfo.attachments[op.attachmentIndices[i]];
      if (partInfo.file)
        continue;
      partsToDownload.push(partInfo);
      // right now all attachments go in sdcard
      storePartsTo.push('sdcard');
      registerDownload.push(op.registerAttachments[i]);
    }

    folderConn.downloadMessageAttachments(uid, partsToDownload, gotParts);
  };

  var downloadErr = null;
  var gotParts = function gotParts(err, bodyBlobs) {
    if (bodyBlobs.length !== partsToDownload.length) {
      callback(err, null, false);
      return;
    }
    downloadErr = err;
    var pendingCbs = 1;
    function next() {
      if (!--pendingCbs) {
        done();
      }
    }

    for (var i = 0; i < partsToDownload.length; i++) {
      // Because we should be under a mutex, this part should still be the
      // live representation and we can mutate it.
      var partInfo = partsToDownload[i],
          blob = bodyBlobs[i],
          storeTo = storePartsTo[i];

      if (blob) {
        partInfo.sizeEstimate = blob.size;
        partInfo.type = blob.type;
        if (storeTo === 'idb') {
          partInfo.file = blob;
        } else {
          pendingCbs++;
          saveToDeviceStorage(
              self, blob, storeTo, registerDownload[i],
              partInfo.name, partInfo, next);
        }
      }
    }

    next();
  };
  function done() {
    folderStorage.updateMessageBody(
      header, bodyInfo,
      { flushBecause: 'blobs' },
      {
        changeDetails: {
          attachments: op.attachmentIndices
        }
      },
      function() {
        callback(downloadErr, null, true);
      });
  };

  self._accessFolderForMutation(folderId, true, gotConn, deadConn,
                                'download');
}

/**
 * Save an attachment to device storage, making the filename unique if we
 * encounter a collision.
 */
var saveToDeviceStorage = exports.saveToDeviceStorage =
function(scope, blob, storeTo, registerDownload, filename, partInfo, cb,
         isRetry) {
  var self = this;
  var callback = function(success, error, savedFilename, registered) {
    if (success) {
      logic(scope, 'savedAttachment', { storeTo: storeTo,
                                        type: blob.type,
                                        size: blob.size });
      console.log('saved attachment to', storeTo, savedFilename,
                  'type:', blob.type, 'registered:', registered);
      partInfo.file = [storeTo, savedFilename];
      cb();
    } else {
      logic(scope, 'saveFailure', { storeTo: storeTo,
                                    type: blob.type,
                                    size: blob.size,
                                    error: error,
                                    filename: filename });
      console.warn('failed to save attachment to', storeTo, filename,
                   'type:', blob.type);
      // if we failed to unique the file after appending junk, just give up
      if (isRetry) {
        cb(error);
        return;
      }
      // retry by appending a super huge timestamp to the file before its
      // extension.
      var idxLastPeriod = filename.lastIndexOf('.');
      if (idxLastPeriod === -1)
        idxLastPeriod = filename.length;
      filename = filename.substring(0, idxLastPeriod) + '-' + $date.NOW() +
        filename.substring(idxLastPeriod);

      saveToDeviceStorage(scope, blob, storeTo, registerDownload,
                          filename, partInfo, cb, true);
    }
  };
  sendMessage('save', [storeTo, blob, filename, registerDownload], callback);
}

exports.local_do_download = function(op, callback) {
  // Downloads are inherently online operations.
  callback(null);
};

exports.check_download = function(op, callback) {
  // If we downloaded the file and persisted it successfully, this job would be
  // marked done because of the atomicity guarantee on our commits.
  callback(null, 'coherent-notyet');
};
exports.local_undo_download = function(op, callback) {
  callback(null);
};
exports.undo_download = function(op, callback) {
  callback(null);
};


exports.local_do_downloadBodies = function(op, callback) {
  callback(null);
};

exports.do_downloadBodies = function(op, callback) {
  var aggrErr = null, totalDownloaded = 0;
  this._partitionAndAccessFoldersSequentially(
    op.messages,
    true,
    function perFolder(folderConn, storage, headers, namers, callWhenDone) {
      folderConn.downloadBodies(headers, op.options, function(err, numDownloaded) {
        totalDownloaded += numDownloaded;
        if (err && !aggrErr) {
          aggrErr = err;
        }
        callWhenDone();
      });
    },
    function allDone() {
      callback(aggrErr, null,
               // save if we might have done work.
               totalDownloaded > 0);
    },
    function deadConn() {
      aggrErr = 'aborted-retry';
    },
    false, // reverse?
    'downloadBodies',
    true // require headers
  );
};

exports.check_downloadBodies = function(op, callback) {
  // If we had downloaded the bodies and persisted them successfully, this job
  // would be marked done because of the atomicity guarantee on our commits.  It
  // is possible this request might only be partially serviced, in which case we
  // will avoid redundant body fetches, but redundant folder selection is
  // possible if this request spans multiple folders.
  callback(null, 'coherent-notyet');
};

exports.check_downloadBodyReps = function(op, callback) {
  // If we downloaded all of the body parts and persisted them successfully,
  // this job would be marked done because of the atomicity guarantee on our
  // commits.  But it's not, so there's more to do.
  callback(null, 'coherent-notyet');
};

exports.do_downloadBodyReps = function(op, callback) {
  var self = this;
  var idxLastSlash = op.messageSuid.lastIndexOf('/'),
      folderId = op.messageSuid.substring(0, idxLastSlash);

  var folderConn, folderStorage;
  // Once we have the connection, get the current state of the body rep.
  var gotConn = function gotConn(_folderConn, _folderStorage) {
    folderConn = _folderConn;
    folderStorage = _folderStorage;

    folderStorage.getMessageHeader(op.messageSuid, op.messageDate, gotHeader);
  };
  var deadConn = function deadConn() {
    callback('aborted-retry');
  };

  var gotHeader = function gotHeader(header) {
    // header may have been deleted by the time we get here...
    if (!header) {
      callback();
      return;
    }

    // Check to see if we've already downloaded the bodyReps for this
    // message. If so, no need to even try to fetch them again. This
    // allows us to enforce an idempotency guarantee regarding how
    // many times body change notifications will be fired.
    folderStorage.getMessageBody(header.suid, header.date,
                                         function(body) {
      if (!folderStorage.messageBodyRepsDownloaded(body)) {
        folderConn.downloadBodyReps(header, onDownloadReps);
      } else {
        // passing flushed = true because we don't need to save anything
        onDownloadReps(null, body, /* flushed = */ true);
      }
    });
  };

  var onDownloadReps = function onDownloadReps(err, bodyInfo, flushed) {
    if (err) {
      console.error('Error downloading reps', err);
      // fail we cannot download for some reason?
      callback('unknown');
      return;
    }

    // Since we downloaded something, we do want to save what we downloaded,
    // but only if the downloader didn't already force a save while flushing.
    var save = !flushed;
    callback(null, bodyInfo, save);
  };

  self._accessFolderForMutation(folderId, true, gotConn, deadConn,
                                'downloadBodyReps');
};

exports.local_do_downloadBodyReps = function(op, callback) {
  callback(null);
};


////////////////////////////////////////////////////////////////////////////////
// sendOutboxMessages

/**
 * Send some messages from the outbox. At a high level, you can
 * pretend that "sendOutboxMessages" just kicks off a process to send
 * all the messages in the outbox.
 *
 * As an implementation detail, to keep memory requirements low, this
 * job is designed to send only one message at a time; it
 * self-schedules future jobs to walk through the list of outbox
 * messages, one at a time.
 *
 * In pseudocode:
 *
 *         CLIENT: "Hey, please kick off a sendOutboxMessages job."
 *   OUTBOX JOB 1: "Okay, I'll send the first message."
 *         CLIENT: "thanks"
 *   OUTBOX JOB 1: "Okay, done. Oh, there are more messages. Scheduling
 *                  a future job to send the next message."
 *         CLIENT: "ok"
 *   OUTBOX JOB 1: *dies*
 *         CLIENT: *goes off to do other things*
 *   OUTBOX JOB 2: "on it, sending another message"
 *
 * This allows other jobs to interleave the sending process, to avoid
 * introducing long delays in a world where we only run one job
 * concurrently.
 *
 * This job accepts a `beforeMessage` parameter; if that parameter is
 * null (the normal case), we'll attempt to send the newest message.
 * After the first message has been sent, we will _self-schedule_ a
 * second sendOutboxMessages job to continue sending the rest of the
 * available messages (one per job).
 *
 * We set `header.sendStatus` to an object representing the current
 * state of the send operation. If the send fails, we'll remove the
 * flag and indicate that there was an error sending, unless the app
 * crashes, in which case we'll try to resend upon startup again (see
 * `outboxNeedsFreshSync`).
 */
exports.do_sendOutboxMessages = function(op, callback) {
  var account = this.account;
  var outboxFolder = account.getFirstFolderWithType('outbox');
  if (!outboxFolder) {
    callback('moot'); // This shouldn't happen, we should always have an outbox.
    return;
  }

  // If we temporarily paused outbox syncing, don't do anything.
  if (!account.outboxSyncEnabled) {
    console.log('outbox: Outbox syncing temporarily disabled; not syncing.');
    callback(null);
    return;
  }

  var outboxNeedsFreshSync = account.outboxNeedsFreshSync;
  if (outboxNeedsFreshSync) {
    console.log('outbox: This is the first outbox sync for this account.');
    account.outboxNeedsFreshSync = false;
  }

  // Hold both a CPU and WiFi wake lock for the duration of the send
  // operation. We'll pass this in to the Composer instance for each
  // message, so that the SMTP/ActiveSync sending process can renew
  // the wake lock from time to time as the send continues.
  var wakeLock = new $wakelocks.SmartWakeLock({
    locks: ['cpu', 'wifi']
  });

  this._accessFolderForMutation(
    outboxFolder.id, /* needConn = */ false,
    function(nullFolderConn, folderStorage) {
      require(['jobs/outbox'], function ($outbox) {
        $outbox.sendNextAvailableOutboxMessage(
          account.compositeAccount || account, // Requires the main account.
          folderStorage,
          op.beforeMessage,
          op.emitNotifications,
          outboxNeedsFreshSync,
          wakeLock
        ).then(function(result) {
          var moreExpected = result.moreExpected;
          var messageNamer = result.messageNamer;

          wakeLock.unlock('send complete');

          // If there may be more messages to send, schedule another
          // sync to send the next available message.
          if (moreExpected) {
            account.universe.sendOutboxMessages(account, {
              beforeMessage: messageNamer
            });
          }
          // Otherwise, we're done. Mark the outbox as "synced".
          else {
            account.universe.notifyOutboxSyncDone(account);
            folderStorage.markSyncRange(
              $sync.OLDEST_SYNC_DATE, null, 'XXX', $date.NOW());
          }
          // Since we modified the folders, save the account.
          callback(null, /* result = */ null, /* save = */ true);
        }).catch(function(e) {
          console.error('Exception while sending a message.',
                        'Send failure: ' + e, e.stack);
          wakeLock.unlock(e);
          callback('aborted-retry');
        });

      });
    },
    /* no conn => no deathback required */ null,
    'sendOutboxMessages');
};

exports.check_sendOutboxMessages = function(op, callback) {
  callback(null, 'moot');
};

exports.local_undo_sendOutboxMessages = function(op, callback) {
  callback(null); // You cannot undo sendOutboxMessages.
};

exports.local_do_setOutboxSyncEnabled = function(op, callback) {
  // Set a flag on the account to prevent us from kicking off further
  // sends while the outbox is being edited on the client. The account
  // referenced by `this.account` is actually the receive piece in a
  // composite account; this flag is initialized in accountmixins.js.
  this.account.outboxSyncEnabled = op.outboxSyncEnabled;
  callback(null);
};

////////////////////////////////////////////////////////////////


exports.postJobCleanup = function(error) {
  if (!error) {
    var deltaMap, fullMap;
    // - apply updates to the serverIdMap map
    if (this._stateDelta.serverIdMap) {
      deltaMap = this._stateDelta.serverIdMap;
      fullMap = this._state.suidToServerId;
      for (var suid in deltaMap) {
        var srvid = deltaMap[suid];
        if (srvid === null)
          delete fullMap[suid];
        else
          fullMap[suid] = srvid;
      }
    }
    // - apply updates to the move map
    if (this._stateDelta.moveMap) {
      deltaMap = this._stateDelta.moveMap;
      fullMap = this._state.moveMap;
      for (var oldSuid in deltaMap) {
        var newSuid = deltaMap[oldSuid];
        fullMap[oldSuid] = newSuid;
      }
    }
  }

  for (var i = 0; i < this._heldMutexReleasers.length; i++) {
    this._heldMutexReleasers[i](error);
  }
  this._heldMutexReleasers = [];

  this._stateDelta.serverIdMap = null;
  this._stateDelta.moveMap = null;
};

exports.allJobsDone =  function() {
  this._state.suidToServerId = {};
  this._state.moveMap = {};
};

/**
 * Partition messages identified by namers by folder, then invoke the callback
 * once per folder, passing in the loaded message header objects for each
 * folder.
 *
 * This method will filter out removed headers (which would otherwise be null).
 * Its possible that entire folders will be skipped if no headers requested are
 * now present.
 *
 * Connection loss by default causes this method to stop trying to traverse
 * folders, calling callOnConnLoss and callWhenDone in that order.  If you want
 * to do something more clever, extend this method so that you can return a
 * sentinel value or promise or something and do your clever thing.
 *
 * @args[
 *   @param[messageNamers @listof[MessageNamer]]
 *   @param[needConn Boolean]{
 *     True if we should try and get a connection from the server.  Local ops
 *     should pass false, server ops should pass true.  This additionally
 *     determines whether we provide headers to the operation (!needConn),
 *     or server id's for messages (needConn).
 *   }
 *   @param[callInFolder @func[
 *     @args[
 *       @param[folderConn ImapFolderConn]
 *       @param[folderStorage FolderStorage]
 *       @param[headersOrServerIds @oneof[
 *         @listof[HeaderInfo]
 *         @listof[ServerID]]
 *       ]
 *       @param[messageNamers @listof[MessageNamer]]
 *       @param[callWhenDoneWithFolder Function]
 *     ]
 *   ]]
 *   @param[callWhenDone @func[
 *     @args[err @oneof[null 'connection-list']]
 *   ]]{
 *     The function to invoke when all of the folders have been processed or the
 *     connection has been lost and we're giving up.  This will be invoked after
 *     `callOnConnLoss` in the event of a conncetion loss.
 *   }
 *   @param[callOnConnLoss Function]{
 *     This function we invoke when we lose a connection.  Traditionally, you would
 *     use this to flag an error in your function that you would then return when
 *     we invoke `callWhenDone`.  Then your check function will be invoked and you
 *     can laboriously check what actually happened on the server, etc.
 *   }
 *   @param[reverse #:optional Boolean]{
 *     Should we walk the partitions in reverse order?
 *   }
 *   @param[label String]{
 *     The label to use to name the usage of the folder connection.
 *   }
 *   @param[requireHeaders Boolean]{
 *     True if connection & headers are needed.
 *   }
 * ]
 */
exports._partitionAndAccessFoldersSequentially = function(
    allMessageNamers,
    needConn,
    callInFolder,
    callWhenDone,
    callOnConnLoss,
    reverse,
    label,
    requireHeaders) {
  var partitions = $util.partitionMessagesByFolderId(allMessageNamers);
  var folderConn, storage, self = this,
      folderId = null, folderMessageNamers = null, serverIds = null,
      iNextPartition = 0, curPartition = null, modsToGo = 0,
      // Set to true immediately before calling callWhenDone; causes us to
      // immediately bail out of any of our callbacks in order to avoid
      // continuing beyond the point when we should have stopped.
      terminated = false;

  if (reverse)
    partitions.reverse();

  var openNextFolder = function openNextFolder() {
    if (terminated)
      return;
    if (iNextPartition >= partitions.length) {
      terminated = true;
      callWhenDone(null);
      return;
    }
    // Cleanup the last folder (if there was one)
    if (iNextPartition) {
      folderConn = null;
      // The folder's mutex should be last; if the callee acquired any
      // additional mutexes in the last round, it should have freed it then
      // too.
      var releaser = self._heldMutexReleasers.pop();
      if (releaser)
        releaser();
      folderConn = null;
    }

    curPartition = partitions[iNextPartition++];
    folderMessageNamers = curPartition.messages;
    serverIds = null;
    if (curPartition.folderId !== folderId) {
      folderId = curPartition.folderId;
      self._accessFolderForMutation(folderId, needConn, gotFolderConn,
                                    connDied, label);
    }
  };
  var connDied = function connDied() {
    if (terminated)
      return;
    if (callOnConnLoss) {
      try {
        callOnConnLoss();
      }
      catch (ex) {
        self.log.error('callbackErr', { ex: ex });
      }
    }
    terminated = true;
    callWhenDone('connection-lost');
  };
  var gotFolderConn = function gotFolderConn(_folderConn, _storage) {
    if (terminated)
      return;
    folderConn = _folderConn;
    storage = _storage;
    // - Get headers or resolve current server id from name map
    if (needConn && !requireHeaders) {
      var neededHeaders = [],
          suidToServerId = self._state.suidToServerId;
      serverIds = [];
      for (var i = 0; i < folderMessageNamers.length; i++) {
        var namer = folderMessageNamers[i];
        var srvid = suidToServerId[namer.suid];
        if (srvid) {
          serverIds.push(srvid);
        }
        else {
          serverIds.push(null);
          neededHeaders.push(namer);
        }
      }

      if (!neededHeaders.length) {
        try {
          callInFolder(folderConn, storage, serverIds, folderMessageNamers,
                       openNextFolder);
        }
        catch (ex) {
          console.error('PAAFS error:', ex, '\n', ex.stack);
        }
      }
      else {
        storage.getMessageHeaders(neededHeaders, gotNeededHeaders);
      }
    }
    else {
      storage.getMessageHeaders(folderMessageNamers, gotHeaders);
    }
  };
  var gotNeededHeaders = function gotNeededHeaders(headers) {
    if (terminated)
      return;
    var iNextServerId = serverIds.indexOf(null);
    for (var i = 0; i < headers.length; i++) {
      var header = headers[i];
      // It's possible that by the time this job actually gets a chance to run
      // that the header is no longer in the folder.  This is rare but not
      // particularly exceptional.
      if (header) {
        var srvid = header.srvid;
        serverIds[iNextServerId] = srvid;
        // A header that exists but does not have a server id is exceptional and
        // bad, although logic should handle it because of the above dead-header
        // case.  suidToServerId should really have provided this information to
        // us.
        if (!srvid)
          console.warn('Header', headers[i].suid, 'missing server id in job!');
      }
      iNextServerId = serverIds.indexOf(null, iNextServerId + 1);
    }

    // its entirely possible that we need headers but there are none so we can
    // skip entering this folder as the job cannot do anything with an empty
    // header.
    if (!serverIds.length) {
      openNextFolder();
      return;
    }

    try {
      callInFolder(folderConn, storage, serverIds, folderMessageNamers,
                   openNextFolder);
    }
    catch (ex) {
      console.error('PAAFS error:', ex, '\n', ex.stack);
    }
  };
  var gotHeaders = function gotHeaders(headers) {
    if (terminated)
      return;
    // its unlikely but entirely possible that all pending headers have been
    // removed somehow between when the job was queued and now.
    if (!headers.length) {
      openNextFolder();
      return;
    }

    // Sort the headers in ascending-by-date order so that slices hear about
    // changes from oldest to newest. That way, they won't get upset about being
    // asked to expand into the past.
    headers.sort(function(a, b) { return a.date > b.date; });
    try {
      callInFolder(folderConn, storage, headers, folderMessageNamers,
                   openNextFolder);
    }
    catch (ex) {
      console.error('PAAFS error:', ex, '\n', ex.stack);
    }
  };
  openNextFolder();
};

exports.local_do_upgradeDB = function (op, doneCallback) {
  var storage = this.account.getFolderStorageForFolderId(op.folderId);
  var filter = function(header) {
    return header.flags &&
      header.flags.indexOf('\\Seen') === -1;
  };
  $count.countHeaders(storage, filter, function(num) {
    storage._dirty = true;
    storage.folderMeta.version = $mailslice.FOLDER_DB_VERSION;
    storage.folderMeta.unreadCount = num;
    doneCallback(/* no error */ null, /* no result */ null,
                 /* yes save */ true);
  });
};

}); // end define
