define(['logic', '../util', 'module', 'require', 'exports',
        '../mailchew', '../syncbase', '../date', '../jobmixins',
        '../allback', './pop3'],
function(logic, util, module, require, exports,
         mailchew, sync, date, jobmixins,
         allback, pop3) {

var PASTWARDS = 1;

/**
 * Manage the synchronization process for POP3 accounts. In IMAP and
 * ActiveSync, the work of this class is split in two (a `folderConn`
 * and syncer), but since POP3 has no concept of folders, the syncer
 * manages everything itself.
 *
 * This class still gets created for each folder for compatibiliy with
 * IMAP/ActiveSync, but we fast-path out of sync operations if the
 * folder we're looking at isn't the inbox.
 */
function Pop3FolderSyncer(account, storage) {
  this.account = account;
  this.storage = storage;

  logic.defineScope(this, 'Pop3FolderSyncer', {
    accountId: account.id,
    folderId: storage.folderId
  });

  // Only sync folders if this is the inbox. Other folders are client-side only.
  this.isInbox = (storage.folderMeta.type === 'inbox');
}
exports.Pop3FolderSyncer = Pop3FolderSyncer;

/**
 * Wrap a function with connection handling, as follows:
 * - If a successful connection can be established, fn gets called with
 *   a connection and the rest of the arguments. The argument at index
 *   cbIndex is wrapped to automatically call the connection `done`
 *   callback.
 * - If connection fails, the argument at index cbIndex is called with
 *   the connection error.
 *
 * @param {boolean} getNew If a fresh connection should always be made.
 * @param {int} cbIndex Index of the parent function's callback in args
 * @param {string} whyLabel Description for why we need the connection
 */
function lazyWithConnection(getNew, cbIndex, whyLabel, fn) {
  return function pop3LazyWithConnection() {
    var args = Array.slice(arguments);
    require([], function () {
      var next = function() {
        // Only the inbox actually needs a connection. Using the
        // connection in a non-inbox folder is an error.
        if (!this.isInbox) {
          fn.apply(this, [null].concat(args));
          return;
        }

        this.account.withConnection(function (err, conn, done) {
          var callback = args[cbIndex];
          if (err) {
            callback && callback(err);
          } else {
            args[cbIndex] = function lazyDone(err) {
              done();
              callback && callback(err);
            };
            fn.apply(this, [conn].concat(args));
          }
        }.bind(this), whyLabel);
      }.bind(this);

      // if we require a fresh connection, close out the old one first.
      if (getNew && this.account._conn &&
          this.account._conn.state !== 'disconnected') {
        this.account._conn.quit(next);
      } else {
        next();
      }
    }.bind(this));
  };
};

Pop3FolderSyncer.prototype = {
  syncable: true,
  get canGrowSync() {
    // Only the inbox can be grown in POP3.
    return this.isInbox;
  },

  /**
   * Given a list of messages, download snippets for those that don't
   * already have snippets. You need to pass an options argument so we
   * only download a snippet. If you don't do that, you are doing
   * something wrong. downloadBodyReps is the one that is for full
   * body part/message downloading. XXX rename this family of methods.
   */
  downloadBodies: lazyWithConnection(/* getNew = */ false, /* cbIndex = */ 2,
    /* whyLabel = */ 'downloadBodies',
  function(conn, headers, options, callback) {
    var latch = allback.latch();
    var storage = this.storage;

    for (var i = 0; i < headers.length; i++) {
      if (headers[i] && headers[i].snippet == null) {
        this.downloadBodyReps(headers[i], options, latch.defer(i));
      }
    }

    latch.then(function(results) {
      var err = null; // pull out the first error, if it exists
      for (var k in results) {
        err = results[k][0];
      }
      callback(err, headers.length);
    });
  }),

  /**
   * Download the full body of a message. POP3 does not distinguish
   * between message bodies and attachments, so we must retrieve them
   * all in one go.
   */
  downloadBodyReps: lazyWithConnection(/* getNew = */ false, /* cbIndex = */ 2,
    /* whyLabel = */ 'downloadBodyReps',
  function(conn, header, options, callback) {
    if (options instanceof Function) {
      callback = options;
      options = {};
    }

    console.log('POP3: Downloading bodyReps for UIDL ' + header.srvid);

    conn.downloadMessageByUidl(header.srvid, function(err, message) {
      if (err) { callback(err); return; }
      // Don't overwrite the header, because it contains useful
      // identifiers like `suid` and things we want. Plus, with POP3,
      // the server's headers will always be the same.
      // However, we do need header.bytesToDownloadForBodyDisplay:
      header.bytesToDownloadForBodyDisplay =
        message.header.bytesToDownloadForBodyDisplay;
      console.log('POP3: Storing message ' + header.srvid +
                  ' with ' + header.bytesToDownloadForBodyDisplay +
                  ' bytesToDownload.');
      // Force a flush if there were any attachments so that any memory-backed
      // Blobs get replaced with their post-save disk-backed equivalent so they
      // can be garbage collected.
      var flush = message.bodyInfo.attachments.length > 0;
      this.storeMessage(header, message.bodyInfo, { flush: flush }, function() {
        callback && callback(null, message.bodyInfo, flush);
      });
    }.bind(this));
  }),

  downloadMessageAttachments: function(uid, partInfos, callback, progress) {
    // We already retrieved the attachments in downloadBodyReps, so
    // this function should never be invoked (because callers would
    // have seen that all relevant partInfos have set `isDownloaded`
    // to true). Either way, there's nothing to do here.
    console.log('POP3: ERROR: downloadMessageAttachments called and ' +
                'POP3 shouldn\'t do that.');
    callback(null, null);
  },

  /**
   * Store a message. Depending on whether or not we've seen the
   * message before, we'll either add it as a new message in storage
   * or update the existing one.
   *
   * Our current POP3 implementation does not automatically delete
   * messages from the server when they've been fetched, so we need to
   * track which messages we've downloaded already and which ones are
   * new. Unfortunately, this means that our sync with the server will
   * take progressively longer as the server accumulates more messages
   * in its store.
   *
   * Some servers might potentially "window" messages, such that the
   * oldest messages in the message list might just drop off the
   * server's list. If so, this code doesn't change; new messages will
   * continue to be newly stored, and old messages will still be
   * known.
   *
   * @param {HeaderInfo} header Message header.
   * @param {BodyInfo} bodyInfo Body information, reps, etc.
   * @param {Object} options
   * @param {Boolean} options.flush Force a flush so the message gets reloaded,
   *                                replacing memory-backed Blobs with
   *                                disk-backed ones?
   * @param {function()} callback
   */
  storeMessage: function(header, bodyInfo, options, callback) {
    callback = callback || function() {};
    var event = {
      changeDetails: {}
    };

    var knownId = this.getMessageIdForUidl(header.srvid);

    if (header.id == null) { // might be zero.
      if (knownId == null) {
        header.id = this.storage._issueNewHeaderId();
      } else {
        header.id = knownId;
      }
      header.suid = this.storage.folderId + '/' + header.id;
      header.guid = header.guid || header.srvid;
    }

    // Save all included attachments before actually storing the
    // message. Downloaded attachments must be converted from a blob
    // to a file on disk.
    var latch = allback.latch();
    var self = this;

    for (var i = 0; i < bodyInfo.attachments.length; i++) {
      var att = bodyInfo.attachments[i];
      if (att.file instanceof Blob) {
        // We want to save attachments to device storage (sdcard),
        // rather than IndexedDB, for now.  It's a v3 thing to use IndexedDB
        // as a cache.
        console.log('Saving attachment', att.file);
        // Always register all POP3 downloads with the download manager since
        // the user didn't have to explicitly trigger download for each
        // attachment.
        var registerDownload = true;
        jobmixins.saveToDeviceStorage(
          self, att.file, 'sdcard', registerDownload, att.name, att,
          latch.defer());
        // When saveToDeviceStorage completes, att.file will
        // be a reference to the file on the sdcard.
      }
    }

    latch.then(function() {
      // Once the attachments have been downloaded, we can store the
      // message. Here, we wait to call back from storeMessage() until
      // we've saved _both_ the header and body.
      latch = allback.latch();

      if (knownId == null) {
        self.storeMessageUidlForMessageId(header.srvid, header.id);
        self.storage.addMessageHeader(header, bodyInfo, latch.defer());
        self.storage.addMessageBody(header, bodyInfo, latch.defer());
      } else {
        self.storage.updateMessageHeader(
          header.date, header.id, true, header, bodyInfo, latch.defer());
        event.changeDetails.attachments = range(bodyInfo.attachments.length);
        event.changeDetails.bodyReps = range(bodyInfo.bodyReps.length);
        var updateOptions = {};
        if (options.flush) {
          updateOptions.flushBecause = 'blobs';
        }
        self.storage.updateMessageBody(
          header, bodyInfo, updateOptions, event, latch.defer());
      }

      latch.then(function() {
        callback(null, bodyInfo);
      });
    });
  },

  /**
   * Return the folderMeta for the INBOX, upon which we store the
   * uidlMap and overflowMap. Cache it for performance, since this
   * function gets invoked frequently.
   */
  get inboxMeta() {
    // Override this getter to provide direct access in the future.
    return (this.inboxMeta = this.account.getFolderMetaForFolderId(
      this.account.getFirstFolderWithType('inbox').id));
  },

  /**
   * Retrieve the message's id (header.id) given a server's UIDL.
   *
   * CAUTION: Zero is a valid message ID. I made the mistake of doing
   * boolean comparisons on header IDs and that is a BAD IDEA. <3
   * Hence the `== null` checks in a few places in this file.
   */
  getMessageIdForUidl: function(uidl) {
    if (uidl == null) {
      return null;
    }
    this.inboxMeta.uidlMap = this.inboxMeta.uidlMap || {};
    return this.inboxMeta.uidlMap[uidl];
  },

  /**
   * Store the given message UIDL so that we know it has already been
   * downloaded. If the message was previously marked as overflow,
   * remove it from the overflow map because we know about it now.
   */
  storeMessageUidlForMessageId: function(uidl, headerId) {
    this.inboxMeta.uidlMap = this.inboxMeta.uidlMap || {};
    this.inboxMeta.uidlMap[uidl] = headerId;
    if (this.inboxMeta.overflowMap) {
      delete this.inboxMeta.overflowMap[uidl];
    }
  },

  /**
   * Mark the given message UIDL as being an "overflow message"; that
   * is, it was NOT downloaded and should be made available to
   * download during a "download more messages..." operation.
   *
   * This data is stored in INBOX's folderMeta like so:
   *
   * overflowMap: {
   *   "(message uidl)": { size: 0 },
   *   ...
   * }
   */
  storeOverflowMessageUidl: function(uidl, size) {
    this.inboxMeta.overflowMap = this.inboxMeta.overflowMap || {};
    this.inboxMeta.overflowMap[uidl] = { size: size };
  },

  /**
   * Return true if there are overflow messages. (If so, we're NOT
   * synced to the dawn of time.)
   */
  hasOverflowMessages: function() {
    if (!this.inboxMeta.overflowMap) { return false; }
    for (var key in this.inboxMeta.overflowMap) {
      return true; // if there's even a single key, we have some!
    }
    return false;
  },

  /**
   * Return whether or not the given UIDL is in the overflow map.
   */
  isUidlInOverflowMap: function(uidl) {
    if (!this.inboxMeta.overflowMap) { return false; }
    return !!this.inboxMeta.overflowMap[uidl];
  },

  /**
   * Sync the inbox for the first time. Since we set `ignoreHeaders`
   * to true, we'll notify mail slices to update after the entire sync
   * completes, so that all messages show up at once rather than one
   * at a time.
   */
  initialSync: function(slice, initialDays, syncCb, doneCb, progressCb) {
    syncCb('sync', true /* ignoreHeaders */);
    this.sync('initial', slice, doneCb, progressCb);
  },

  /**
   * Sync the inbox for a refresh. This is the same as initialSync for
   * POP3, except that we notify slices immediately upon receiving
   * each new message individually.
   */
  refreshSync: function(
      slice, dir, startTS, endTS, origStartTS, doneCb, progressCb) {
    this.sync('refresh', slice, doneCb, progressCb);
  },

  /**
   * The unit tests issue "delete on server but not locally" commands.
   * In order to mimic operations where we modify non-INBOX folders on
   * the server and expect to learn about them from the client on
   * sync, we queue up "server-only" modifications and execute them
   * upon sync. This allows us to reuse much of the existing tests for
   * certain folder operations, and becomes a no-op in production.
   *
   * @return {Boolean} true if a save is needed because we're actually doing
   * something.
   */
  _performTestAdditionsAndDeletions: function(cb) {
    var meta = this.storage.folderMeta;
    var numAdds = 0;
    var latch = allback.latch();
    var saveNeeded = false;
    if (meta._TEST_pendingHeaderDeletes) {
      meta._TEST_pendingHeaderDeletes.forEach(function(namer) {
        saveNeeded = true;
        this.storage.deleteMessageHeaderAndBody(namer.suid, namer.date,
                                                latch.defer());
      }, this);
      meta._TEST_pendingHeaderDeletes = null;
    }
    if (meta._TEST_pendingAdds) {
      meta._TEST_pendingAdds.forEach(function(msg) {
        saveNeeded = true;
        this.storeMessage(msg.header, msg.bodyInfo, {}, latch.defer());
      }, this);
      meta._TEST_pendingAdds = null;
    }
    latch.then(function(results) { cb(); });
    return saveNeeded;
  },

  /**
   * If we have overflow messages, fetch them here.
   */
  growSync: function(slice, growthDirection, anchorTS, syncStepDays,
                     doneCallback, progressCallback) {
    if (growthDirection !== PASTWARDS || !this.hasOverflowMessages()) {
      return false;
    }

    // For simplicity, we ignore anchorTS and syncStepDays, because
    // POP3's limitations make it difficult to infer anything about
    // the messages we're going to download now. All we can do here is
    // download another batch of overflow messages.
    this.sync('grow', slice, doneCallback, progressCallback);
    return true;
  },

  allConsumersDead: function() {
    // Nothing to do here.
  },

  shutdown: function() {
    // Nothing to do here either.
  },

  /**
   * Pull down new headers from the server, attempting to fetch
   * snippets for the messages.
   *
   * Pop3Client (in pop3.js) contains the variables used to determine
   * how much of each message to fetch. Since POP3 only lets us
   * download a certain number of _lines_ from the message, Pop3Client
   * selects an appropriate snippet size (say, 4KB) and attempts to
   * fetch approximately that much data for each message. That value
   * is/should be high enough that we get snippets for nearly all
   * messages, unless a message is particularly strange.
   *
   * Additionally, we don't delete messages from the server. This
   * means that when we attempt to list messages, we'll see new
   * messages along with messages we've seen before. To ensure we only
   * retrieve messages we don't know about, we keep track of message
   * unique IDs (UIDLs) and only download new messages.
   *
   * OVERFLOW MESSAGE HANDLING:
   *
   * We don't want to overwhelm a sync with a ridiculous number of
   * messages if the spool has a lot of new messagse. Instead of
   * blindly downloading all headers right away, we store excess
   * "overflow" messages for future "grow" syncs, e.g. when the user
   * clicks "Get More Messages" in the message list.
   *
   * This works as follows:
   *
   * If we're syncing normally, mark any excess messages as overflow
   * messages and don't download them. This is handled largely by
   * Pop3Client by the maxMessages option to listMessages(). We ignore
   * any messages already marked as overflow for the purposes of the
   * sync filter.
   *
   * If this is a grow sync, i.e. we want to download some overflow
   * messages, we set the download filter to _only_ include overflow
   * UIDLs. We may still have _more_ overflow messages, but that's
   * okay, because they'll just be stored in the overflowMap like
   * normal, for a future "grow" sync. Any messages we do download are
   * marked as stored and removed from the overflowMap (in
   * `this.storeMessageUidlForMessageId`).
   */
  sync: lazyWithConnection(/* getNew = */ true, /* cbIndex = */ 2,
  /* whyLabel = */ 'sync',
  function(conn, syncType, slice, realDoneCallback, progressCallback) {
    // if we could not establish a connection, abort the sync.
    var self = this;
    logic(self, 'sync:begin', { syncType: syncType });

    // Avoid invoking realDoneCallback multiple times.  Cleanup when we switch
    // sync to promises/tasks.
    var doneFired = false;
    var doneCallback = function(err) {
      if (doneFired) {
        logic(self, 'sync:duplicateDone', { syncType: syncType, err: err });
        return;
      }
      logic(self, 'sync:end', { syncType: syncType, err: err });
      doneFired = true;
      // coerce the rich error object to a string error code; currently
      // refreshSlice only likes 'unknown' and 'aborted' so just run with
      // unknown.
      realDoneCallback(err ? 'unknown' : null);
    };

    // Only fetch info for messages we don't already know about.
    var filterFunc;
    if (syncType !== 'grow') {
      // In a regular sync, download any message that we don't know
      // about that isn't in the overflow map.
      filterFunc = function(uidl) {
        return self.getMessageIdForUidl(uidl) == null && // might be 0
          !self.isUidlInOverflowMap(uidl);
      };
    } else /* (syncType === 'grow') */ {
      // In a 'grow' sync, ONLY download overflow messages.
      filterFunc = this.isUidlInOverflowMap.bind(this);
    }

    var bytesStored = 0;
    var numMessagesSynced = 0;
    var latch = allback.latch();
    // We only want to trigger a save if work is actually being done.  This is
    // ugly/complicated because in order to let POP3 use the existing IMAP tests
    // that did things in other folders, a test-only bypass route was created
    // that has us actually add the messages
    var saveNeeded;

    if (!this.isInbox) {
      slice.desiredHeaders = (this._TEST_pendingAdds &&
                              this._TEST_pendingAdds.length);
      saveNeeded = this._performTestAdditionsAndDeletions(latch.defer());
    } else {
      saveNeeded = true;
      logic(this, 'sync_begin');
      var fetchDoneCb = latch.defer();

      var closeExpected = false;
      // register for a close notification so if disaster recovery closes the
      // connection we still get a chance to report the error without breaking
      // sync.  This is the lowest priority onclose handler so all the other
      // more specific error handlers will get a chance to fire.  However, some
      // like to defer to future turns of the event loop so we we use setTimeout
      // to defer through at least two turns of the event loop.
      conn.onclose = function() {
        if (closeExpected) {
          return;
        }
        closeExpected = true;
        // see the above.  This is horrible but we hate POP3 and these error
        // handling cases are edge-casey and this actually does improve our test
        // coverage.  (test_pop3_dead_connection.js's first two test clauses
        // were written before I added this onclose handler.)
        window.setTimeout(function() {
          window.setTimeout(function() {
            doneCallback('closed');
          }, 0);
        }, 0);
      };
      // Fetch messages, ensuring that we don't actually store them all in
      // memory so as not to burden memory unnecessarily.
      conn.listMessages({
        filter: filterFunc,
        checkpointInterval: sync.POP3_SAVE_STATE_EVERY_N_MESSAGES,
        maxMessages: sync.POP3_MAX_MESSAGES_PER_SYNC,
        checkpoint: function(next) {
          // Every N messages, wait for everything to be stored to
          // disk and saved in the database. Then proceed.
          this.account.__checkpointSyncCompleted(next, 'syncBatch');
        }.bind(this),
        progress: function fetchProgress(evt) {
          // Store each message as it is retrieved.
          var totalBytes = evt.totalBytes;
          var message = evt.message;
          var messageCb = latch.defer();

          this.storeMessage(message.header, message.bodyInfo, {}, function() {
            bytesStored += evt.size;
            numMessagesSynced++;
            progressCallback(0.1 + 0.7 * bytesStored / totalBytes);
            messageCb();
          });
        }.bind(this),
      }, function fetchDone(err, numSynced, overflowMessages) {
        // Upon downloading all of the messages, we MUST issue a QUIT
        // command. This will tear down the connection, however if we
        // don't, we will never receive notifications of new messages.
        // If we deleted any messages on the server (which we don't),
        // the QUIT command is what would actually cause those to be
        // persisted. In the future, when we support server-side
        // deletion, we should ensure that this QUIT does not
        // inadvertently commit unintended deletions.
        closeExpected = true;
        conn.quit();

        if (err) {
          doneCallback(err);
          return;
        }

        // If there were excess messages, mark them for later download.
        if (overflowMessages.length) {
          overflowMessages.forEach(function(message) {
            this.storeOverflowMessageUidl(message.uidl, message.size);
          }, this);
          logic(this, 'overflowMessages', { count: overflowMessages.length });
        }

        // When all of the messages have been persisted to disk, indicate
        // that we've successfully synced. Refresh our view of the world.
        fetchDoneCb();
      }.bind(this));
    }

    latch.then((function onSyncDone() {
      // Because POP3 has no concept of syncing discrete time ranges,
      // we have to trick the storage into marking everything synced
      // _except_ the dawn of time. This has to be slightly later than
      // a value that would be interpreted as the dawn of time -- in
      // this case, it has to be one day plus one. Ideally, this
      // should be abstracted a little better; it's mostly IMAP that
      // needs more involved logic.
      this.storage.markSyncRange(
        sync.OLDEST_SYNC_DATE + date.DAY_MILLIS + 1,
        date.NOW(), 'XXX', date.NOW());

      if (!this.hasOverflowMessages()) {
        this.storage.markSyncedToDawnOfTime();
      }

      if (this.isInbox) {
        logic(this, 'sync_end');
      }
      // Don't notify completion until the save completes, if relevant.
      if (saveNeeded) {
        this.account.__checkpointSyncCompleted(doDoneStuff, 'syncComplete');
      } else {
        doDoneStuff();
      }
    }).bind(this));

    var doDoneStuff = function() {
      if (syncType === 'initial') {
        // If it's the first time we've synced, we've set
        // ignoreHeaders to true, which means that slices don't know
        // about new messages. We'll reset ignoreHeaders to false
        // here, and then instruct the database to load messages
        // again.
        //
        // We're waiting for the database to settle. Since POP3
        // doesn't guarantee message ordering (in terms of listing
        // messages in your maildrop), if we just blindly updated the
        // current slice, the UI might frantically update as new
        // messages come in. So for the initial sync, just batch them
        // all in.
        this.storage._curSyncSlice.ignoreHeaders = false;
        this.storage._curSyncSlice.waitingOnData = 'db';
        this.storage.getMessagesInImapDateRange(
          sync.OLDEST_SYNC_DATE, null,
          sync.INITIAL_FILL_SIZE, sync.INITIAL_FILL_SIZE,
          // Don't trigger a refresh; we just synced. Accordingly,
          // releaseMutex can be null.
          this.storage.onFetchDBHeaders.bind(
            this.storage, this.storage._curSyncSlice,
            false, doneCallback, null));
      } else {
        doneCallback(null);
      }
    }.bind(this);
  }),
};

/** Return an array with the integers [0, end). */
function range(end) {
  var ret = [];
  for (var i = 0; i < end; i++) {
    ret.push(i);
  }
  return ret;
}


}); // end define
