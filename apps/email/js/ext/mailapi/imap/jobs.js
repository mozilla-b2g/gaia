/**
 * Abstractions for dealing with the various mutation operations.
 *
 * NB: Moves discussion is speculative at this point; we are just thinking
 * things through for architectural implications.
 *
 * == Speculative Operations ==
 *
 * We want our UI to update as soon after requesting an operation as possible.
 * To this end, we have logic to locally apply queued mutation operations.
 * Because we may want to undo operations when we are offline (and have not
 * been able to talk to the server), we also need to be able to reflect these
 * changes locally independent of telling the server.
 *
 * In the case of moves/copies, we issue a(n always locally created) id for the
 * message immediately and just set the server UID (srvid) to 0 to be populated
 * by the sync process.
 *
 * == Data Integrity ==
 *
 * Our strategy is always to avoid server data-loss, so data-destruction actions
 * must always take place after successful confirmation of persistence actions.
 * (Just keeping the data in-memory is not acceptable because we could crash,
 * etc.)
 *
 * This is in contrast to our concern about losing simple, frequently performed
 * idempotent user actions in a crash.  We assume that A) crashes will be
 * rare, B) the user will not be surprised or heart-broken if a message they
 * marked read a second before a crash needs to manually be marked read after
 * restarting the app/device, and C) there are performance/system costs to
 * saving the state which makes this a reasonable trade-off.
 *
 * It is also our strategy to avoid cluttering up the place as a side-effect
 * of half-done things.  For example, if we are trying to move N messages,
 * but only copy N/2 because of a timeout, we want to make sure that we
 * don't naively retry and then copy those first N/2 messages a second time.
 * This means that we track sub-steps explicitly, and that operations that we
 * have issued and may or may not have been performed by the server will be
 * checked before they are re-attempted.  (Although IMAP batch operations
 * are atomic, and our IndexedDB commits are atomic, they are atomic independent
 * of each other and so we could have been notified that the copy completed
 * but not persisted the fact to our database.)
 *
 * In the event we restore operations from disk that were enqueued but
 * apparently not run, we compel them to run a check operation before they are
 * performed because it's possible (depending on the case) for us to have run
 * them without saving the account state first.  This is a trade-off between the
 * cost of checking and the cost of issuing commits to the database frequently
 * based on the expected likelihood of a crash on our part.  Per comments above,
 * we expect crashes to be rare and not particularly correlated with operations,
 * so it's better for the device (both flash and performance) if we don't
 * continually checkpoint our state.
 *
 * All non-idempotent operations / operations that could result in data loss or
 * duplication require that we save our account state listing the operation.  In
 * the event of a crash, this allows us to know that we have to check the state
 * of the operation for completeness before attempting to run it again and
 * allowing us to finish half-done things.  For particular example, because
 * moves consist of a copy followed by flagging a message deleted, it is of the
 * utmost importance that we don't get in a situation where we have copied the
 * messages but not deleted them and we crash.  In that case, if we failed to
 * persist our plans, we will have duplicated the message (and the IMAP server
 * would have no reason to believe that was not our intent.)
 **/

define('mailapi/imap/jobs',
  [
    'rdcommon/log',
    '../jobmixins',
    'module',
    'exports'
  ],
  function(
    $log,
    $jobmixins,
    $module,
    exports
  ) {

/**
 * The evidence suggests the job has not yet been performed.
 */
const CHECKED_NOTYET = 'checked-notyet';
/**
 * The operation is idempotent and atomic, just perform the operation again.
 * No checking performed.
 */
const UNCHECKED_IDEMPOTENT = 'idempotent';
/**
 * The evidence suggests that the job has already happened.
 */
const CHECKED_HAPPENED = 'happened';
/**
 * The job is no longer relevant because some other sequence of events
 * have mooted it.  For example, we can't change tags on a deleted message
 * or move a message between two folders if it's in neither folder.
 */
const CHECKED_MOOT = 'moot';
/**
 * A transient error (from the checker's perspective) made it impossible to
 * check.
 */
const UNCHECKED_BAILED = 'bailed';
/**
 * The job has not yet been performed, and the evidence is that the job was
 * not marked finished because our database commits are coherent.  This is
 * appropriate for retrieval of information, like the downloading of
 * attachments.
 */
const UNCHECKED_COHERENT_NOTYET = 'coherent-notyet';

/**
 * @typedef[MutationState @dict[
 *   @key[suidToServerId @dictof[
 *     @key[SUID]
 *     @value[ServerID]
 *   ]]{
 *     Tracks the server id (UID on IMAP) for an account as it is currently
 *     believed to exist on the server.  We persist this because the actual
 *     header may have been locally moved to another location already, so
 *     there may not be storage for the information in the folder when
 *     subsequent non-local operations run (such as another move or adding
 *     a tag).
 *
 *     This table is entirely populated by the actual (non-local) move
 *     operations.  Entries remain in this table until they are mooted by a
 *     subsequent move or the table is cleared once all operations for the
 *     account complete.
 *   }
 *   @key[moveMap @dictof[
 *     @key[oldSuid SUID]
 *     @value[newSuid SUID]
 *   ]]{
 *     Expresses the relationship between moved messages by local-operations.
 *   }
 * ]]
 *
 * @typedef[MutationStateDelta @dict[
 *   @key[serverIdMap @dictof[
 *     @key[suid SUID]
 *     @value[srvid @oneof[null ServerID]]
 *   ]]{
 *     New values for `MutationState.suidToServerId`; set/updated by by
 *     non-local operations once the operation has been performed.  A null
 *     `srvid` is used to convey the header no longer exists at the previous
 *     name.
 *   }
 *   @key[moveMap @dictof[
 *     @key[oldSuid SUID]
 *     @value[newSuid SUID]
 *   ]]{
 *     Expresses the relationship between moved messages by local-operations.
 *   }
 * ]]{
 *   A set of attributes that can be set on an operation to cause changes to
 *   the `MutationState` for the account.  This forms part of the interface
 *   of the operations.  The operations don't manipulate the table directly
 *   to reduce code duplication, ease debugging, and simplify unit testing.
 * }
 **/

function ImapJobDriver(account, state, _parentLog) {
  this.account = account;
  this.resilientServerIds = false;
  this._heldMutexReleasers = [];

  this._LOG = LOGFAB.ImapJobDriver(this, _parentLog, this.account.id);

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
exports.ImapJobDriver = ImapJobDriver;
ImapJobDriver.prototype = {
  /**
   * Request access to an IMAP folder to perform a mutation on it.  This
   * acquires a write mutex on the FolderStorage and compels the ImapFolderConn
   * in question to acquire an IMAP connection if it does not already have one.
   *
   * The callback will be invoked with the folder and raw connections once
   * they are available.  The raw connection will be actively in the folder.
   *
   * There is no need to explicitly release the connection when done; it will
   * be automatically released when the mutex is released if desirable.
   *
   * This will ideally be migrated to whatever mechanism we end up using for
   * mailjobs.
   *
   * @args[
   *   @param[folderId]
   *   @param[needConn Boolean]{
   *     True if we should try and get a connection from the server.  Local ops
   *     should pass false.
   *   }
   *   @param[callback @func[
   *     @args[
   *       @param[folderConn ImapFolderConn]
   *       @param[folderStorage FolderStorage]
   *     ]
   *   ]]
   *   @param[deathback Function]
   *   @param[label String]{
   *     The label to identify this usage for debugging purposes.
   *   }
   * ]
   */
  _accessFolderForMutation: function(folderId, needConn, callback, deathback,
                                     label) {
    var storage = this.account.getFolderStorageForFolderId(folderId),
        self = this;
    storage.runMutexed(label, function(releaseMutex) {
      self._heldMutexReleasers.push(releaseMutex);
      var syncer = storage.folderSyncer;
      if (needConn && !syncer.folderConn._conn) {
        syncer.folderConn.acquireConn(callback, deathback, label);
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

  /**
   * Request access to a connection for some type of IMAP manipulation that does
   * not involve a folder known to the system (which should then be accessed via
   * _accessfolderForMutation).
   *
   * The connection will be automatically released when the operation completes,
   * there is no need to release it directly.
   */
  _acquireConnWithoutFolder: function(label, callback, deathback) {
    this._LOG.acquireConnWithoutFolder_begin(label);
    const self = this;
    this.account.__folderDemandsConnection(
      null, label,
      function(conn) {
        self._LOG.acquireConnWithoutFolder_end(label);
        self._heldMutexReleasers.push(function() {
          self.account.__folderDoneWithConnection(conn, false, false);
        });
        try {
          callback(conn);
        }
        catch (ex) {
          self._LOG.callbackErr(ex);
        }
      },
      deathback
    );
  },

  postJobCleanup: $jobmixins.postJobCleanup,

  allJobsDone: $jobmixins.allJobsDone,

  //////////////////////////////////////////////////////////////////////////////
  // download: Download one or more attachments from a single message

  local_do_download: $jobmixins.local_do_download,

  do_download: $jobmixins.do_download,

  check_download: $jobmixins.check_download,

  local_undo_download: $jobmixins.local_undo_download,

  undo_download: $jobmixins.undo_download,

  //////////////////////////////////////////////////////////////////////////////
  // modtags: Modify tags on messages

  local_do_modtags: $jobmixins.local_do_modtags,

  do_modtags: function(op, jobDoneCallback, undo) {
    var addTags = undo ? op.removeTags : op.addTags,
        removeTags = undo ? op.addTags : op.removeTags;

    var aggrErr = null;

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
        var uids = [];
        for (var i = 0; i < serverIds.length; i++) {
          var srvid = serverIds[i];
          // The header may have disappeared from the server, in which case the
          // header is moot.
          if (srvid)
            uids.push(srvid);
        }
        // Be done if all of the headers were moot.
        if (!uids.length) {
          callWhenDone();
          return;
        }
        if (addTags) {
          modsToGo++;
          folderConn._conn.addFlags(uids, addTags, tagsModded);
        }
        if (removeTags) {
          modsToGo++;
          folderConn._conn.delFlags(uids, removeTags, tagsModded);
        }
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
    callback(null, UNCHECKED_IDEMPOTENT);
  },

  local_undo_modtags: $jobmixins.local_undo_modtags,

  undo_modtags: function(op, callback) {
    // Undoing is just a question of flipping the add and remove lists.
    return this.do_modtags(op, callback, true);
  },

  //////////////////////////////////////////////////////////////////////////////
  // delete: Delete messages

  local_do_delete: $jobmixins.local_do_delete,

  /**
   * Move the message to the trash folder.  In Gmail, there is no move target,
   * we just delete it and gmail will (by default) expunge it immediately.
   */
  do_delete: function(op, doneCallback) {
    var trashFolder = this.account.getFirstFolderWithType('trash');
    this.do_move(op, doneCallback, trashFolder.id);
  },

  check_delete: function(op, doneCallback) {
    var trashFolder = this.account.getFirstFolderWithType('trash');
    this.check_move(op, doneCallback, trashFolder.id);
  },

  local_undo_delete: $jobmixins.local_undo_delete,

  undo_delete: function(op, doneCallback) {
  },

  //////////////////////////////////////////////////////////////////////////////
  // move: Move messages between folders (in a single account)
  //
  // ## General Strategy ##
  //
  // Local Do:
  //
  // - Move the header to the target folder's storage, updating the op with the
  //   message-id header of the message for each message so that the check
  //   operation has them available.
  //
  //   This requires acquiring a write mutex to the target folder while also
  //   holding one on the source folder.  We are assured there is no deadlock
  //   because only operations are allowed to manipulate multiple folders at
  //   once, and only one operation is in-flight per an account at a time.
  //   (And cross-account moves are not handled by this operation.)
  //
  //   Insertion is done using the INTERNALDATE (which must be maintained by the
  //   COPY operation) and a freshly allocated id, just like if we had heard
  //   about the header from the server.
  //
  // Do:
  //
  // - Acquire a connection to the target folder so that we can know the UIDNEXT
  //   value prior to performing the copy.  FUTURE: Don't do this if the server
  //   supports UIDPLUS.
  //
  // (Do the following in a loop per-source folder)
  //
  // - Copy the messages to the target folder via COPY.
  //
  // - Figure out the UIDs of our moved messages.  FUTURE: If the server is
  //   UIDPLUS, we already know these from the results of the previous command.
  //   NOW: Issue a fetch on the message-id headers of the messages in the
  //   range UIDNEXT:*.  Use these results to map the UIDs to the messages we
  //   copied above.  In the event of duplicate message-id's, ordering doesn't
  //   matter, we just pick the first one.  Update our UIDNEXT value in case
  //   there is another pass through the loop.
  //
  // - Issue deletes on the messages from the source folder.
  //
  // Check: XXX TODO POSTPONED FOR PRELIMINARY LANDING
  //
  // NB: Our check implementation actually is a correcting check implemenation;
  // we will make things end up the way they should be.  We do this because it
  // is simpler than
  //
  // - Acquire a connection to the target folder.  Issue broad message-id
  //   header searches to find if the messages appear to be in the folder
  //   already, note which are already present.  This needs to take the form
  //   of a SEARCH followed by a FETCH to map UIDs to message-id's.  In theory
  //   the IMAP copy command should be atomic, but I'm not sure we can trust
  //   that and we also have the problem where there could already be duplicate
  //   message-id headers in the target which could confuse us if our check is
  //   insufficiently thorough.  The FETCH needs to also retrieve the flags
  //   for the message so we can track deletion state.
  //
  // (Do the following in a loop per source folder)
  //
  // - Acquire connections for each source folder.  Issue message-id searches
  //   like we did for the target including header results.  In theory we might
  //   remember the UIDs for check acceleration purposes, but that would not
  //   cover if we tried to perform an undo, so we go for thorough.
  //
  // -
  //
  // ## Possible Problems and their Solutions ##
  //
  // Moves are fairly complicated in terms of moving parts, so let's enumate the
  // way things could go wrong so we can make sure we address them and describe
  // how we address them.  Note that it's a given that we will have run our
  // local modifications prior to trying to talk to the server, which reduces
  // the potential badness.
  //
  // #1: We attempt to resynchronize the source folder for a move prior to
  //     running the operation against the server, resulting in us synchronizing
  //     a duplicate header into existence that will not be detected until the
  //     next resync of the time range (which will be strictly after when we
  //     actually run the mutation.
  //
  // #2: Operations scheduled against speculative headers.  It is quite possible
  //     for the user to perform actions against one of the locally /
  //     speculatively moved headers while we are offline/have not yet played
  //     the operation/are racing the UI while playing the operation.  We
  //     obviously want these changes to succeed.
  //
  // Our solutions:
  //
  // #1: Prior to resynchronizing a folder, we check if there are any operations
  //     that block synchronization.  An un-run move with a source of that
  //     folder counts as such an operation.  We can determine this by either
  //     having sufficient knowledge to inspect an operation or have operations
  //     directly modify book-keeping structures in the folders as part of their
  //     actions.  (Add blocker on local_(un)do, remove on (un)do.)  We choose
  //     to implement the inspection operation by having all operations
  //     implement a simple helper to tell us if the operation blocks entry.
  //     The theory is this will be less prone to bugs since it will be clear
  //     that operations need to implement the method, whereas it would be less
  //     clear that operations need to do call the folder-state mutating
  //     options.
  //
  // #2: Operations against speculative headers are a concern only from a naming
  //     perspective for operations.  Operations are strictly run in the order
  //     they are enqueued, so we know that the header will have been moved and
  //     be in the right folder.  Additionally, because both the UI and
  //     operations name messages using an id we issue rather than the server
  //     UID, there is no potential for naming inconsistencies.  The UID will be
  //     resolved at operation run-time which only requires that the move
  //     operation either was UIDPLUS or we manually sussed out the target id
  //     (which we do for simplicity).
  //
  // XXX problem: repeated moves and UIDs.
  // what we do know:
  // - in order to know about a message, we must have a current UID of the
  //   message on the server where it currently lives.
  // what we could do:
  // - have successor move operations moot/replace their predecessor.  So a
  //   move from A to B, and then from B to C will just become a move from A to
  //   C from the perspective of the online op that will eventually be run.  We
  //   could potentially build this on top of a renaming strategy.  So if we
  //   move z-in-A to z-in-B, and then change a tag on z-in-B, and then move
  //   z-in-B to z-in-C, renaming and consolidatin would make this a move of
  //   z-in-A to z-in-C followed by a tag change on z-in-C.
  // - produce micro-IMAP-ops as a byproduct of our local actions that are
  //   stored on the operation.  So in the A/move to B/tag/move to C case above,
  //   we would not consolidate anything, just produce a transaction journal.
  //   The A-move-to-B case would be covered by serializing the information
  //   for the IMAP COPY and deletion.  In the UIDPLUS case, we have an
  //   automatic knowledge of the resulting new target UID; in the non-UIDPLUS
  //   case we can open the target folder and find out the new UID as part of
  //   the micro-op.  The question here is then how we chain these various
  //   results together in the multi-move case, or when we write the result to
  //   the target:
  //   - maintain an output value map for the operations.  When there is just
  //     the one move, the output for the UID for each move is the current
  //     header name of the message, which we will load and write the value
  //     into.  When there are multiple moves, the output map is adjusted and
  //     used to indicate that we should stash the UID in quasi-persistent
  //     storage for a subsequent move operation.  (This could be thought of
  //     as similar to the renaming logic, but explicit.)


  local_do_move: $jobmixins.local_do_move,

  do_move: function(op, jobDoneCallback, targetFolderId) {
    var state = this._state, stateDelta = this._stateDelta, aggrErr = null;
    if (!stateDelta.serverIdMap)
      stateDelta.serverIdMap = {};
    if (!targetFolderId)
      targetFolderId = op.targetFolder;

    this._partitionAndAccessFoldersSequentially(
      op.messages, true,
      function perFolder(folderConn, sourceStorage, serverIds, namers,
                         perFolderDone){
        // XXX process UIDPLUS output when present, avoiding this step.
        var guidToNamer = {}, waitingOnHeaders = namers.length,
            reportedHeaders = 0, retriesLeft = 3, targetConn;

        // - got the target folder conn, now do the copies
        function gotTargetConn(targetConn, targetStorage) {
          var uidnext = targetConn.box._uidnext;
          folderConn._conn.copy(serverIds, targetStorage.folderMeta.path,
                                copiedMessages_reselect);

          function copiedMessages_reselect() {
            // Force a re-select of the folder to try and force the server to
            // perceive the move.  This was necessary for me at least on my
            // dovceot test setup.  Although we had heard that the COPY
            // completed, our FETCH was too fast, although an IDLE did report
            // the new messages after that.

            // We need to use a callback here because imap.js's state
            // checking is immediate, so it's very possible to race the folder
            // selection and lose.
            targetConn.reselectBox(copiedMessages_findNewUIDs);
          }
          // - copies are done, find the UIDs
          function copiedMessages_findNewUIDs() {
            var fetcher = targetConn._conn.fetch(
              uidnext + ':*',
              {
                request: {
                  headers: ['MESSAGE-ID'],
                  struct: false,
                  body: false
                }
              });
            // because we aren't waiting for body data, we can just process the
            // 'message' event directly without registering for an 'end' event
            // on it.
            fetcher.on('message', function(msg) {
              msg.on('end', fetchedMessageData);
            });
            // We don't need to wait for 'end' since we know how many of these
            // we care about.
            fetcher.on('error', function(err) {
              aggrErr = err;
              perFolderDone();
            });
            fetcher.on('end', function() {
              if (reportedHeaders < namers.length) {
                // If we didn't hear about all the headers, let's retry in
                // a little bit.
                if (--retriesLeft === 0) {
                  aggrErr = 'aborted-retry';
                  perFolderDone();
                  return;
                }

                window.setTimeout(copiedMessages_findNewUIDs, 500);
              }
            });
          }
          function fetchedMessageData(msg) {
            var guid = msg.msg.meta.messageId;
            if (!guidToNamer.hasOwnProperty(guid))
              return;
            reportedHeaders++;
            var namer = guidToNamer[guid];
            stateDelta.serverIdMap[namer.suid] = msg.id;
            uidnext = msg.id + 1;
            var newSuid = state.moveMap[namer.suid];
            var newId =
                  parseInt(newSuid.substring(newSuid.lastIndexOf('/') + 1));
            targetStorage.updateMessageHeader(
              namer.date, newId, false,
              function(header) {
                // If the header isn't there because it got moved, then null
                // will be returned and it's up to the next move operation
                // to fix this up.
                if (header)
                  header.srvid = msg.id;
                else
                  console.warn('did not find header for', namer.suid,
                               newSuid, namer.date, newId);
                if (--waitingOnHeaders === 0)
                  foundUIDs_deleteOriginals();
                return true;
              });
          }
        }

        function foundUIDs_deleteOriginals() {
          folderConn._conn.addFlags(serverIds, ['\\Deleted'],
                                    deletedMessages);
        }
        function deletedMessages(err) {
          if (err)
            aggrErr = true;
          perFolderDone();
        }

        // Build a guid-to-namer map and deal with any messages that no longer
        // exist on the server.  Do it backwards so we can splice.
        for (var i = namers.length - 1; i >= 0; i--) {
          var srvid = serverIds[i];
          if (!srvid) {
            serverIds.splice(i, 1);
            namers.splice(i, 1);
            continue;
          }
          var namer = namers[i];
          guidToNamer[namer.guid] = namer;
        }
        // it's possible all the messages could be gone, in which case we
        // are done with this folder already!
        if (serverIds.length === 0) {
          perFolderDone();
          return;
        }

        if (sourceStorage.folderId === targetFolderId) {
          if (op.type === 'move') {
            // A move from a folder to itself is a no-op.
            processNext();
          }
          else { // op.type === 'delete'
            // If the op is a delete and the source and destination folders
            // match, we're deleting from trash, so just perma-delete it.
            foundUIDs_deleteOriginals();
          }
        }
        else {
          // Resolve the target folder again.
          this._accessFolderForMutation(targetFolderId, true, gotTargetConn,
                                        function targetFolderDead() {},
                                        'move target');
        }
      }.bind(this),
      function() {
        jobDoneCallback(aggrErr);
      },
      null,
      false,
      'local move source');
  },

  /**
   * See section block comment for more info.
   *
   * XXX implement checking logic for move
   */
  check_move: function(op, doneCallback, targetFolderId) {
    // get a connection in the target folder
    // do a search on message-id's to check if the messages got copied across.
    doneCallback(null, 'moot');
  },

  local_undo_move: $jobmixins.local_undo_move,

  /**
   * Move the message back to its original folder.
   *
   * - If the source message has not been expunged, remove the Deleted flag from
   *   the source folder.
   * - If the source message was expunged, copy the message back to the source
   *   folder.
   * - Delete the message from the target folder.
   *
   * XXX implement undo functionality for move
   */
  undo_move: function(op, doneCallback, targetFolderId) {
    doneCallback('moot');
  },

  //////////////////////////////////////////////////////////////////////////////
  // append: Add a message to a folder
  //
  // Message should look like:
  // {
  //    messageText: the message body,
  //    date: the date to use as the INTERNALDATE of the message,
  //    flags: the initial set of flags for the message
  // }

  local_do_append: function(op, doneCallback) {
    doneCallback(null);
  },

  /**
   * Append a message to a folder.
   */
  do_append: function(op, callback) {
    var folderConn, self = this,
        storage = this.account.getFolderStorageForFolderId(op.folderId),
        folderMeta = storage.folderMeta,
        iNextMessage = 0;

    var gotFolderConn = function gotFolderConn(_folderConn) {
      if (!_folderConn) {
        done('unknown');
        return;
      }
      folderConn = _folderConn;
      if (folderConn._conn.hasCapability('MULTIAPPEND'))
        multiappend();
      else
        append();
    };
    var deadConn = function deadConn() {
      callback('aborted-retry');
    };
    var multiappend = function multiappend() {
      iNextMessage = op.messages.length;
      folderConn._conn.multiappend(op.messages, appended);
    };
    var append = function append() {
      var message = op.messages[iNextMessage++];
      folderConn._conn.append(
        message.messageText,
        message, // (it will ignore messageText)
        appended);
    };
    var appended = function appended(err) {
      if (err) {
        console.error('failure appending message', err);
        done('unknown');
        return;
      }
      if (iNextMessage < op.messages.length)
        append();
      else
        done(null);
    };
    var done = function done(errString) {
      if (folderConn)
        folderConn = null;
      callback(errString);
    };

    this._accessFolderForMutation(op.folderId, true, gotFolderConn, deadConn,
                                  'append');
  },

  /**
   * Check if the message ended up in the folder.
   *
   * TODO implement
   */
  check_append: function(op, doneCallback) {
    // XXX search on the message-id in the folder to verify its presence.
    doneCallback(null, 'moot');
  },

  // TODO implement
  local_undo_append: function(op, doneCallback) {
    doneCallback(null);
  },

  // TODO implement
  undo_append: function(op, doneCallback) {
    doneCallback('moot');
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
    var account = this.account, reported = false;
    this._acquireConnWithoutFolder(
      'syncFolderList',
      function gotConn(conn) {
        account._syncFolderList(conn, function(err) {
            if (!err)
              account.meta.lastFolderSyncAt = Date.now();
            // request an account save
            if (!reported)
              doneCallback(err ? 'aborted-retry' : null, null, !err);
            reported = true;
          });
      },
      function deadConn() {
        if (!reported)
          doneCallback('aborted-retry');
        reported = true;
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
  // createFolder: Create a folder

  local_do_createFolder: function(op, doneCallback) {
    // we never locally perform this operation.
    doneCallback(null);
  },

  do_createFolder: function(op, callback) {
    var path, delim, parentFolderId = null;
    if (op.parentFolderId) {
      if (!this.account._folderInfos.hasOwnProperty(op.parentFolderId))
        throw new Error("No such folder: " + op.parentFolderId);
      var parentFolder = this.account._folderInfos[op.parentFolderId];
      delim = parentFolder.$meta.delim;
      path = parentFolder.$meta.path + delim;
      parentFolderId = parentFolder.$meta.id;
    }
    else {
      path = '';
      delim = this.account.meta.rootDelim;
    }
    if (typeof(op.folderName) === 'string')
      path += op.folderName;
    else
      path += op.folderName.join(delim);
    if (op.containOnlyOtherFolders)
      path += delim;

    var rawConn = null, self = this;
    function gotConn(conn) {
      // create the box
      rawConn = conn;
      rawConn.addBox(path, addBoxCallback);
    }
    function addBoxCallback(err) {
      if (err) {
        // If the folder already exists, we are done.
        if (err.serverResponse &&
            /\[ALREADYEXISTS\]/.test(err.serverResponse)) {
          done(null);
          return;
        }
        console.error('Error creating box:', err);
        // XXX implement the already-exists check...
        done('unknown');
        return;
      }
      // Do a list on the folder so that we get the right attributes and any
      // magical case normalization performed by the server gets observed by
      // us.
      rawConn.getBoxes('', path, gotBoxes);
    }
    function gotBoxes(err, boxesRoot) {
      if (err) {
        console.error('Error looking up box:', err);
        done('unknown');
        return;
      }
      // We need to re-derive the path.  The hierarchy will only be that
      // required for our new folder, so we traverse all children and create
      // the leaf-node when we see it.
      var folderMeta = null;
      function walkBoxes(boxLevel, pathSoFar, pathDepth) {
        for (var boxName in boxLevel) {
          var box = boxLevel[boxName],
              boxPath = pathSoFar ? (pathSoFar + boxName) : boxName;
          if (box.children) {
            walkBoxes(box.children, boxPath + box.delim, pathDepth + 1);
          }
          else {
            var type = self.account._determineFolderType(box, boxPath);
            folderMeta = self.account._learnAboutFolder(
              boxName, boxPath, parentFolderId, type, box.delim, pathDepth);
          }
        }
      }
      walkBoxes(boxesRoot, '', 0);
      if (folderMeta)
        done(null, folderMeta);
      else
        done('unknown');
    }
    function done(errString, folderMeta) {
      if (rawConn)
        rawConn = null;
      if (callback)
        callback(errString, folderMeta);
    }
    function deadConn() {
      callback('aborted-retry');
    }
    this._acquireConnWithoutFolder('createFolder', gotConn, deadConn);
  },

  check_createFolder: function(op, doneCallback) {
  },

  local_undo_createFolder: function(op, doneCallback) {
    doneCallback(null);
  },

  // TODO: port deleteFolder to be an op and invoke it here
  undo_createFolder: function(op, doneCallback) {
    doneCallback('moot');
  },

  //////////////////////////////////////////////////////////////////////////////
  // purgeExcessMessages

  local_do_purgeExcessMessages: function(op, doneCallback) {
    this._accessFolderForMutation(
      op.folderId, false,
      function withMutex(_ignoredConn, storage) {
        storage.purgeExcessMessages(function(numDeleted, cutTS) {
          // Indicate that we want a save performed if any messages got deleted.
          doneCallback(null, null, numDeleted > 0);
        });
      },
      null,
      'purgeExcessMessages');
  },

  do_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  check_purgeExcessMessages: function(op, doneCallback) {
    // this is a local-only modification, so this doesn't really matter
    return UNCHECKED_IDEMPOTENT;
  },

  local_undo_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  undo_purgeExcessMessages: function(op, doneCallback) {
    doneCallback(null);
  },

  //////////////////////////////////////////////////////////////////////////////
};

function HighLevelJobDriver() {
}
HighLevelJobDriver.prototype = {
  /**
   * Perform a cross-folder move:
   *
   * - Fetch the entirety of a message from the source location.
   * - Append the entirety of the message to the target location.
   * - Delete the message from the source location.
   */
  do_xmove: function() {
  },

  check_xmove: function() {

  },

  /**
   * Undo a cross-folder move.  Same idea as for normal undo_move; undelete
   * if possible, re-copy if not.  Delete the target once we're confident
   * the message made it back into the folder.
   */
  undo_xmove: function() {
  },

  /**
   * Perform a cross-folder copy:
   * - Fetch the entirety of a message from the source location.
   * - Append the message to the target location.
   */
  do_xcopy: function() {
  },

  check_xcopy: function() {
  },

  /**
   * Just delete the message from the target location.
   */
  undo_xcopy: function() {
  },
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  ImapJobDriver: {
    type: $log.DAEMON,
    asyncJobs: {
      acquireConnWithoutFolder: { label: false },
    },
    errors: {
      callbackErr: { ex: $log.EXCEPTION },
    },
  },
});

}); // end define
