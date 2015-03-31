define(function(require, exports) {

var DisasterRecovery = require('./disaster-recovery');
var logic = require('logic');

/**
 * The no-op operation for job operations that are not implemented.
 * Returns successs in a future turn of the event loop.
 */
function unimplementedJobOperation(op, callback) {
  window.setZeroTimeout(function() {
    callback(null, null);
  });
}

/**
 * Account Mixins:
 *
 * This mixin function is executed from the constructor of the
 * CompositeAccount and ActiveSyncAccount, with 'this' being bound to
 * the main account instance. If the account has separate receive/send
 * parts, they are passed as arguments. (ActiveSync's receive and send
 * pieces merely reference the root account.)
 */
exports.accountConstructorMixin = function(receivePiece, sendPiece) {
  // The following flags are set on the receivePiece, because the
  // receiving side is what manages the job operations (and sending
  // messages from the outbox is a job).

  // On startup, we need to ignore any stale sendStatus information
  // from messages in the outbox. See `sendOutboxMessages` in
  // jobmixins.js.
  receivePiece.outboxNeedsFreshSync = true;
  // This is a runtime flag, used to temporarily prevent
  // `sendOutboxMessages` from executing, such as when the user is
  // actively trying to edit the list of messages in the Outbox.
  receivePiece.outboxSyncEnabled = true;
};

/**
 * @args[
 *   @param[op MailOp]
 *   @param[mode @oneof[
 *     @case['local_do']{
 *       Apply the mutation locally to our database rep.
 *     }
 *     @case['check']{
 *       Check if the manipulation has been performed on the server.  There
 *       is no need to perform a local check because there is no way our
 *       database can be inconsistent in its view of this.
 *     }
 *     @case['do']{
 *       Perform the manipulation on the server.
 *     }
 *     @case['local_undo']{
 *       Undo the mutation locally.
 *     }
 *     @case['undo']{
 *       Undo the mutation on the server.
 *     }
 *   ]]
 *   @param[callback @func[
 *     @args[
 *       @param[error @oneof[String null]]
 *     ]
 *   ]]
 *   }
 * ]
 */
exports.runOp = function runOp(op, mode, callback) {
  console.log('runOp(' + mode + ': ' + JSON.stringify(op).substring(0, 160) +
              ')');

  var methodName = mode + '_' + op.type;

  // If the job driver doesn't support the operation, assume that it
  // is a moot operation that will succeed. Assign it a no-op callback
  // that completes in the next tick, so as to maintain job ordering.
  var method = this._jobDriver[methodName];
  if (!method) {
    console.warn('Unsupported op:', op.type, 'mode:', mode);
    method = unimplementedJobOperation;
  }

  var alreadyCompleted = false;

  var jobCompletedCallback = function(error, resultIfAny, accountSaveSuggested) {
    // If DisasterRecovery already called the completion callback due
    // to an unforeseen error, ensure that we don't try to
    // double-resolve this job.
    if (alreadyCompleted) {
      console.warn('Job already completed, ignoring secondary completion:',
                   mode, JSON.stringify(op).substring(0, 160), error, resultIfAny);
      return;
    }
    alreadyCompleted = true;

    DisasterRecovery.clearCurrentAccountOp(this);
    this._jobDriver.postJobCleanup(error);
    // We used to log the runOp_end here, but this is too early because the
    //  book-keeping for the op actually happens in the following callback.  So
    //  we leave it to _localOpCompleted and _serverOpCompleted to log this.
    // defer the callback to the next tick to avoid deep recursion
    window.setZeroTimeout(function() {
      callback(error, resultIfAny, accountSaveSuggested);
    });
  }.bind(this);

  DisasterRecovery.setCurrentAccountOp(this, op, jobCompletedCallback);

  // Legacy tests:
  logic(this, 'runOp_begin', { mode: mode, type: op.type, op: op });
  // New-style tests:
  Object.defineProperty(op, '_logicAsyncEvent', {
    configurable: true,
    enumerable: false, // So that we don't try to JSONify it.
    value: logic.startAsync(this, 'runOp', {
      mode: mode, type: op.type, op: op
    })
  });

  try {
    method.call(this._jobDriver, op, jobCompletedCallback);
  }
  catch (ex) {
    DisasterRecovery.clearCurrentAccountOp(this);
    logic(this, 'opError', { mode: mode, type: op.type, ex: ex });
  }
};


/**
 * Return the folder metadata for the first folder with the given type, or null
 * if no such folder exists.
 */
exports.getFirstFolderWithType = function(type) {
  var folders = this.folders;
  for (var iFolder = 0; iFolder < folders.length; iFolder++) {
    if (folders[iFolder].type === type)
      return folders[iFolder];
  }
 return null;
};
exports.getFolderByPath = function(folderPath) {
  var folders = this.folders;
  for (var iFolder = 0; iFolder < folders.length; iFolder++) {
    if (folders[iFolder].path === folderPath)
      return folders[iFolder];
  }
 return null;
};

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
exports.normalizeFolderHierarchy = function() {
  // Find a folder for which we'd like to become a sibling.
  var sibling =
        this.getFirstFolderWithType('drafts') ||
        this.getFirstFolderWithType('sent');

  // If for some reason we can't find those folders yet, that's
  // okay, we will try this again after the next folder sync.
  if (!sibling) {
    return;
  }

  var parent = this.getFolderMetaForFolderId(sibling.parentId);

  // NOTE: `parent` may be null if `sibling` is a top-level folder.
  var foldersToMove = [this.getFirstFolderWithType('localdrafts'),
                       this.getFirstFolderWithType('outbox')];

  foldersToMove.forEach(function(folder) {
    // These folders should always exist, but we double-check here
    // for safety. Also, if the folder is already in the right
    // place, we're done.
    if (!folder || folder.parentId === sibling.parentId) {
      return;
    }

    console.log('Moving folder', folder.name,
                'underneath', parent && parent.name || '(root)');


    this.universe.__notifyRemovedFolder(this, folder);

    // On `delim`: We previously attempted to discover a
    // server-specific root delimiter. ActiveSync hard-codes "/". POP3
    // doesn't even go that far. An empty delimiter would be
    // incorrect, as it could cause folder paths to smush into one
    // another. In the case where our folder doesn't specify a
    // delimiter, fall back to the standard-ish '/'.
    if (parent) {
      folder.path = parent.path + (parent.delim || '/') + folder.name;
      folder.delim = parent.delim || '/';
      folder.parentId = parent.id;
      folder.depth = parent.depth + 1;
    } else {
      folder.path = folder.name;
      folder.delim = '/';
      folder.parentId = null;
      folder.depth = 0;
    }

    this.universe.__notifyAddedFolder(this, folder);

  }, this);

};

/**
 * Save the state of this account to the database.  This entails updating all
 * of our highly-volatile state (folderInfos which contains counters, accuracy
 * structures, and our block info structures) as well as any dirty blocks.
 *
 * This should be entirely coherent because the structured clone should occur
 * synchronously during this call, but it's important to keep in mind that if
 * that ever ends up not being the case that we need to cause mutating
 * operations to defer until after that snapshot has occurred.
 */
exports.saveAccountState = function(reuseTrans, callback, reason) {
  if (!this._alive) {
    logic(this, 'accountDeleted', { reason: 'saveAccountState' });
    return null;
  }

  logic(this, 'saveAccountState_begin', { reason: reason,
                                          folderSaveCount: null });

  // Indicate save is active, in case something, like
  // signaling the end of a sync, needs to run after
  // a save, via runAfterSaves.
  this._saveAccountStateActive = true;
  if (!this._deferredSaveAccountCalls) {
    this._deferredSaveAccountCalls = [];
  }

  if (callback)
    this.runAfterSaves(callback);

  var perFolderStuff = [], self = this;
  for (var iFolder = 0; iFolder < this.folders.length; iFolder++) {
    var folderPub = this.folders[iFolder],
        folderStorage = this._folderStorages[folderPub.id],
        folderStuff = folderStorage.generatePersistenceInfo();
    if (folderStuff)
      perFolderStuff.push(folderStuff);
  }
  var folderSaveCount = perFolderStuff.length;
  var trans = this._db.saveAccountFolderStates(
    this.id, this._folderInfos, perFolderStuff,
    this._deadFolderIds,
    function stateSaved() {
      this._saveAccountStateActive = false;
      logic(this, 'saveAccountState_end', { reason: reason,
                                           folderSaveCount: folderSaveCount });

      // NB: we used to log when the save completed, but it ended up being
      // annoying to the unit tests since we don't block our actions on
      // the completion of the save at this time.

      var callbacks = this._deferredSaveAccountCalls;
      this._deferredSaveAccountCalls = [];
      callbacks.forEach(function(callback) {
        callback();
      });
    }.bind(this),
    reuseTrans);
  // Reduce the length of time perFolderStuff and its contents are kept alive.
  perFolderStuff = null;
  this._deadFolderIds = null;
  return trans;
};

exports.runAfterSaves = function(callback) {
  if (this._saveAccountStateActive || this._saveAccountIsImminent) {
    this._deferredSaveAccountCalls.push(callback);
  } else {
    callback();
  }
};

/**
 * This function goes through each folder storage object in
 * an account and performs the necessary upgrade steps if
 * there is a new version. See upgradeIfNeeded in mailslice.js.
 * Note: This function schedules a job for each folderStorage
 * object in the account.
 */
exports.upgradeFolderStoragesIfNeeded = function() {
  for (var key in this._folderStorages) {
    var storage = this._folderStorages[key];
    storage.upgradeIfNeeded();
  }
}

}); // end define
