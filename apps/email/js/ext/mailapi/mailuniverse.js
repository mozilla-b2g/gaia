/**
 *
 **/

define('mailapi/mailuniverse',
  [
    'rdcommon/log',
    'rdcommon/logreaper',
    './a64',
    './syncbase',
    './maildb',
    './cronsync',
    './accountcommon',
    'module',
    'exports'
  ],
  function(
    $log,
    $logreaper,
    $a64,
    $syncbase,
    $maildb,
    $cronsync,
    $acctcommon,
    $module,
    exports
  ) {

/**
 * How many operations per account should we track to allow for undo operations?
 * The B2G email app only demands a history of 1 high-level op for undoing, but
 * we are supporting somewhat more for unit tests, potential fancier UIs, and
 * because high-level ops may end up decomposing into multiple lower-level ops
 * someday.
 *
 * This limit obviously is not used to discard operations not yet performed!
 */
const MAX_MUTATIONS_FOR_UNDO = 10;

/**
 * When debug logging is enabled, how many second's worth of samples should
 * we keep?
 */
const MAX_LOG_BACKLOG = 30;

/**
 * The MailUniverse is the keeper of the database, the root logging instance,
 * and the mail accounts.  It loads the accounts from the database on startup
 * asynchronously, so whoever creates it needs to pass a callback for it to
 * invoke on successful startup.
 *
 * Our concept of mail accounts bundles together both retrieval (IMAP,
 * activesync) and sending (SMTP, activesync) since they really aren't
 * separable and in some cases are basically the same (activesync) or coupled
 * (BURL SMTP pulling from IMAP, which we don't currently do but aspire to).
 *
 * @typedef[ConnInfo @dict[
 *   @key[hostname]
 *   @key[port]
 *   @key[crypto @oneof[
 *     @case[false]{
 *       No encryption; plaintext.
 *     }
 *     @case['starttls']{
 *       Upgrade to TLS after establishing a plaintext connection.  Abort if
 *       the server seems incapable of performing the upgrade.
 *     }
 *     @case[true]{
 *       Establish a TLS connection from the get-go; never use plaintext at all.
 *       By convention this may be referred to as an SSL or SSL/TLS connection.
 *     }
 * ]]
 * @typedef[AccountCredentials @dict[
 *   @key[username String]{
 *     The name we use to identify ourselves to the server.  This will
 *     frequently be the whole e-mail address.  Ex: "joe@example.com" rather
 *     than just "joe".
 *   }
 *   @key[password String]{
 *     The password.  Ideally we would have a keychain mechanism so we wouldn't
 *     need to store it like this.
 *   }
 * ]]
 * @typedef[IdentityDef @dict[
 *   @key[id String]{
 *     Unique identifier resembling folder id's;
 *     "{account id}-{unique value for this account}" is what it looks like.
 *   }
 *   @key[name String]{
 *     Display name, ex: "Joe User".
 *   }
 *   @key[address String]{
 *     E-mail address, ex: "joe@example.com".
 *   }
 *   @key[replyTo @oneof[null String]]{
 *     The e-mail address to put in the "reply-to" header for recipients
 *     to address their replies to.  If null, the header will be omitted.
 *   }
 *   @key[signature @oneof[null String]]{
 *     An optional signature block.  If present, we ensure the body text ends
 *     with a newline by adding one if necessary, append "-- \n", then append
 *     the contents of the signature.  Once we start supporting HTML, we will
 *     need to indicate whether the signature is plaintext or HTML.  For now
 *     it must be plaintext.
 *   }
 * ]]
 * @typedef[UniverseConfig @dict[
 *   @key[nextAccountNum Number]
 *   @key[nextIdentityNum Number]
 *   @key[debugLogging Boolean]{
 *     Has logging been turned on for debug purposes?
 *   }
 * ]]{
 *   The configuration fields stored in the database.
 * }
 * @typedef[AccountDef @dict[
 *   @key[id AccountId]
 *   @key[name String]{
 *     The display name for the account.
 *   }
 *   @key[identities @listof[IdentityDef]]
 *
 *   @key[type @oneof['imap+smtp' 'activesync']]
 *   @key[receiveType @oneof['imap' 'activesync']]
 *   @key[sendType @oneof['smtp' 'activesync']]
 *   @key[receiveConnInfo ConnInfo]
 *   @key[sendConnInfo ConnInfo]
 * ]]
 * @typedef[MessageNamer @dict[
 *   @key[date DateMS]
 *   @key[suid SUID]
 * ]]{
 *   The information we need to locate a message within our storage.  When the
 *   MailAPI tells the back-end things, it uses this representation.
 * }
 * @typedef[SerializedMutation @dict[
 *   @key[type @oneof[
 *     @case['modtags']{
 *       Modify tags by adding and/or removing them.  Idempotent and atomic
 *       under all implementations; no explicit account saving required.
 *     }
 *     @case['delete']{
 *       Delete a message under the "move to trash" model.  For IMAP, this is
 *       the same as a move operation.
 *     }
 *     @case['move']{
 *       Move message(s) within the same account.  For IMAP, this is neither
 *       atomic or idempotent and requires account state to be checkpointed as
 *       running the operation prior to running it.  Dunno for ActiveSync, but
 *       probably atomic and idempotent.
 *     }
 *     @case['copy']{
 *       NOT YET IMPLEMENTED (no gaia UI requirement).  But will be:
 *       Copy message(s) within the same account.  For IMAP, atomic and
 *       idempotent.
 *     }
 *   ]]{
 *     The implementation opcode used to determine what functions to call.
 *   }
 *   @key[longtermId]{
 *     Unique-ish identifier for the mutation.  Just needs to be unique enough
 *     to not refer to any pending or still undoable-operation.
 *   }
 *   @key[lifecyle @oneof[
 *     @case['do']{
 *       The initial state of an operation; indicates we want to execute the
 *       operation to completion.
 *     }
 *     @case['done']{
 *       The operation completed, it's done!
 *     }
 *     @case['undo']{
 *       We want to undo the operation.
 *     }
 *     @case['undone']{
 *     }
 *   ]]{
 *     Tracks the overall desired state and completion state of the operation.
 *     Operations currently cannot be redone after they are undone.  This field
 *     differs from the `localStatus` and `serverStatus` in that they track
 *     what we have done to the local database and the server rather than our
 *     goals.  It is very possible for an operation to have a lifecycle of
 *     'undone' without ever having manipulated the local database or told the
 *     server anything.
 *   }
 *   @key[localStatus @oneof[
 *     @case[null]{
 *       Nothing has happened; no changes have been made to the local database.
 *     }
 *     @case['doing']{
 *       'local_do' is running.  An attempt to undo the operation while in this
 *       state will not interrupt 'local_do', but will enqueue the operation
 *       to run 'local_undo' subsequently.
 *     }
 *     @case['done']{
 *       'local_do' has successfully run to completion.
 *     }
 *     @case['undoing']{
 *       'local_undo' is running.
 *     }
 *     @case['undone']{
 *       'local_undo' has successfully run to completion or we canceled the
 *       operation
 *     }
 *     @case['unknown']{
 *       We're not sure what actually got persisted to disk.  If we start
 *       generating more transactions once we're sure the I/O won't be harmful,
 *       we can remove this state.
 *     }
 *   ]]{
 *     The state of the local mutation effects of this operation.  This used
 *     to be conflated together with `serverStatus` in a single status variable,
 *     but the multiple potential undo transitions once local_do became async
 *     made this infeasible.
 *   }
 *   @key[serverStatus @oneof[
 *     @case[null]{
 *       Nothing has happened; no attempt has been made to talk to the server.
 *     }
 *     @case['check']{
 *       We don't know what has or hasn't happened on the server so we need to
 *       run a check operation before doing anything.
 *     }
 *     @case['checking']{
 *       A check operation is currently being run.
 *     }
 *     @case['doing']{
 *       'do' is currently running.  Invoking `undoMutation` will not attempt to
 *       stop 'do', but will enqueue the operation with a desire of 'undo' to be
 *       run later.
 *     }
 *     @case['done']{
 *       'do' successfully ran to completion.
 *     }
 *     @case['undoing']{
 *       'undo' is currently running.  Invoking `undoMutation` will not attempt
 *       to stop this but will enqueut the operation with a desire of 'do' to be
 *       run later.
 *     }
 *     @case['undone']{
 *       The operation was 'done' and has now been 'undone'.
 *     }
 *     @case['moot']{
 *       The job is no longer relevant; the messages it operates on don't exist,
 *       the target folder doesn't exist, or we failed so many times that we
 *       assume something is fundamentally wrong and the request simply cannot
 *       be executed.
 *     }
 *   ]]{
 *     The state of the operation on the server.  This is tracked separately
 *     from the `localStatus` to reduce the number of possible states.
 *   }
 *   @key[tryCount Number]{
 *     How many times have we attempted to run this operation.  If we retry an
 *     operation too many times, we eventually will discard it with the
 *     assumption that it's never going to succeed.
 *   }
 *   @key[humanOp String]{
 *     The user friendly opcode where flag manipulations like starring have
 *     their own opcode.
 *   }
 *   @key[messages @listof[MessageNamer]]
 *
 *   @key[folderId #:optional FolderId]{
 *     If this is a move/copy, the target folder
 *   }
 * ]]
 */
function MailUniverse(callAfterBigBang, testOptions) {
  /** @listof[Account] */
  this.accounts = [];
  this._accountsById = {};

  /** @listof[IdentityDef] */
  this.identities = [];
  this._identitiesById = {};

  /**
   * @dictof[
   *   @key[AccountID]
   *   @value[@dict[
   *     @key[active Boolean]{
   *       Is there an active operation right now?
   *     }
   *     @key[local @listof[SerializedMutation]]{
   *       Operations to be run for local changes.  This queue is drained with
   *       preference to the `server` queue.  Operations on this list will also
   *       be added to the `server` list.
   *     }
   *     @key[server @listof[SerializedMutation]]{
   *       Operations to be run against the server.
   *     }
   *     @key[deferred @listof[SerializedMutation]]{
   *       Operations that were taken out of either of the above queues because
   *       of a failure where we need to wait some amount of time before
   *       retrying.
   *     }
   *   ]]
   * ]{
   *   Per-account lists of operations to run for local changes (first priority)
   *   and against the server (second priority).  This does not contain
   *   completed operations; those are stored on `MailAccount.mutations` (along
   *   with uncompleted operations!)
   * }
   */
  this._opsByAccount = {};
  // populated by waitForAccountOps, invoked when all ops complete
  this._opCompletionListenersByAccount = {};
  // maps longtermId to a callback that cares. non-persisted.
  this._opCallbacks = {};

  this._bridges = [];

  // We used to try and use navigator.connection, but it's not supported on B2G,
  // so we have to use navigator.onLine like suckers.
  this.online = true; // just so we don't cause an offline->online transition
  this._bound_onConnectionChange = this._onConnectionChange.bind(this);
  window.addEventListener('online', this._bound_onConnectionChange);
  window.addEventListener('offline', this._bound_onConnectionChange);
  this._onConnectionChange();

  this._testModeDisablingLocalOps = false;

  /**
   * A setTimeout handle for when we next dump deferred operations back onto
   * their operation queues.
   */
  this._deferredOpTimeout = null;
  this._boundQueueDeferredOps = this._queueDeferredOps.bind(this);

  this.config = null;
  this._logReaper = null;
  this._logBacklog = null;

  this._LOG = null;
  this._db = new $maildb.MailDB(testOptions);
  this._cronSyncer = new $cronsync.CronSyncer(this);
  var self = this;
  this._db.getConfig(function(configObj, accountInfos, lazyCarryover) {
    function setupLogging(config) {
      if (self.config.debugLogging) {
        if (self.config.debugLogging !== 'dangerous') {
          console.warn('GENERAL LOGGING ENABLED!');
          console.warn('(CIRCULAR EVENT LOGGING WITH NON-SENSITIVE DATA)');
          $log.enableGeneralLogging();
        }
        else {
          console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
          console.warn('DANGEROUS USER-DATA ENTRAINING LOGGING ENABLED !!!');
          console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
          console.warn('This means contents of e-mails and passwords if you');
          console.warn('set up a new account.  (The IMAP protocol sanitizes');
          console.warn('passwords, but the bridge logger may not.)');
          console.warn('...................................................');
          $log.DEBUG_markAllFabsUnderTest();
        }
      }
    }

    var accountInfo, i;
    if (configObj) {
      self.config = configObj;
      setupLogging();
      self._LOG = LOGFAB.MailUniverse(self, null, null);
      if (self.config.debugLogging)
        self._enableCircularLogging();

      self._LOG.configLoaded(self.config, accountInfos);

      for (i = 0; i < accountInfos.length; i++) {
        accountInfo = accountInfos[i];
        self._loadAccount(accountInfo.def, accountInfo.folderInfo);
      }
    }
    else {
      self.config = {
        // We need to put the id in here because our startup query can't
        // efficiently get both the key name and the value, just the values.
        id: 'config',
        nextAccountNum: 0,
        nextIdentityNum: 0,
        debugLogging: lazyCarryover ? lazyCarryover.config.debugLogging : false,
        syncCheckIntervalEnum: $syncbase.DEFAULT_CHECK_INTERVAL_ENUM,
      };
      setupLogging();
      self._LOG = LOGFAB.MailUniverse(self, null, null);
      if (self.config.debugLogging)
        self._enableCircularLogging();
      self._db.saveConfig(self.config);

      // - Try to re-create any accounts using old account infos.
      if (lazyCarryover) {
        self._LOG.configMigrating(lazyCarryover);
        var waitingCount = lazyCarryover.accountInfos.length;
        var oldVersion = lazyCarryover.oldVersion;
        for (i = 0; i < lazyCarryover.accountInfos.length; i++) {
          var accountInfo = lazyCarryover.accountInfos[i];
          $acctcommon.recreateAccount(self, oldVersion, accountInfo,
                                      function() {
            // We don't care how they turn out, just that they get a chance
            // to run to completion before we call our bootstrap complete.
            if (--waitingCount === 0) {
              self._initFromConfig();
              callAfterBigBang();
            }
          });
        }
        // Do not let callAfterBigBang get called.
        return;
      }
      else {
        self._LOG.configCreated(self.config);
      }
    }
    self._initFromConfig();
    callAfterBigBang();
  });
}
exports.MailUniverse = MailUniverse;
MailUniverse.prototype = {
  //////////////////////////////////////////////////////////////////////////////
  // Logging
  _enableCircularLogging: function() {
    this._logReaper = new $logreaper.LogReaper(this._LOG);
    this._logBacklog = [];
    window.setInterval(
      function() {
        var logTimeSlice = this._logReaper.reapHierLogTimeSlice();
        // if nothing interesting happened, this could be empty, yos.
        if (logTimeSlice.logFrag) {
          this._logBacklog.push(logTimeSlice);
          // throw something away if we've got too much stuff already
          if (this._logBacklog.length > MAX_LOG_BACKLOG)
            this._logBacklog.shift();
        }
      }.bind(this),
      1000);
  },

  createLogBacklogRep: function(id) {
    return {
      type: 'backlog',
      id: id,
      schema: $log.provideSchemaForAllKnownFabs(),
      backlog: this._logBacklog,
    };
  },

  dumpLogToDeviceStorage: function() {
    console.log('Planning to dump log to device storage for "videos"');
    try {
      // 'default' does not work, but pictures does.  Hopefully gallery is
      // smart enough to stay away from my log files!
      var storage = navigator.getDeviceStorage('videos');
      // HACK HACK HACK: DeviceStorage does not care about our use-case at all
      // and brutally fails to write things that do not have a mime type (and
      // apropriately named file), so we pretend to be a realmedia file because
      // who would really have such a thing?
      var blob = new Blob([JSON.stringify(this.createLogBacklogRep())],
                          {
                            type: 'video/lies',
                            endings: 'transparent'
                          });
      var filename = 'gem-log-' + Date.now() + '.json.rm';
      var req = storage.addNamed(blob, filename);
      req.onsuccess = function() {
        console.log('saved log to', filename);
      };
      req.onerror = function() {
        console.error('failed to save log to', filename, 'err:',
                      this.error.name);
      };
    }
    catch(ex) {
      console.error('Problem dumping log to device storage:', ex,
                    '\n', ex.stack);
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  // Config / Settings

  /**
   * Perform initial initialization based on our configuration.
   */
  _initFromConfig: function() {
    this._cronSyncer.setSyncIntervalMS(
      $syncbase.CHECK_INTERVALS_ENUMS_TO_MS[this.config.syncCheckIntervalEnum]);
  },

  /**
   * Return the subset of our configuration that the client can know about.
   */
  exposeConfigForClient: function() {
    // eventually, iterate over a whitelist, but for now, it's easy...
    return {
      debugLogging: this.config.debugLogging,
      syncCheckIntervalEnum: this.config.syncCheckIntervalEnum,
    };
  },

  modifyConfig: function(changes) {
    for (var key in changes) {
      var val = changes[key];
      switch (key) {
        case 'syncCheckIntervalEnum':
          if (!$syncbase.CHECK_INTERVALS_ENUMS_TO_MS.hasOwnProperty(val))
            continue;
          this._cronSyncer.setSyncIntervalMS(
            $syncbase.CHECK_INTERVALS_ENUMS_TO_MS[val]);
          break;
        case 'debugLogging':
          break;
        default:
          continue;
      }
      this.config[key] = val;
    }
    this._db.saveConfig(this.config);
    this.__notifyConfig();
  },

  __notifyConfig: function() {
    var config = this.exposeConfigForClient();
    for (var iBridge = 0; iBridge < this._bridges.length; iBridge++) {
      var bridge = this._bridges[iBridge];
      bridge.notifyConfig(config);
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  _onConnectionChange: function() {
    var wasOnline = this.online;
    /**
     * Are we online?  AKA do we have actual internet network connectivity.
     * This should ideally be false behind a captive portal.  This might also
     * end up temporarily false if we move to a 2-phase startup process.
     */
    this.online = navigator.onLine;
    // Knowing when the app thinks it is online/offline is going to be very
    // useful for our console.log debug spew.
    console.log('Email knows that it is:', this.online ? 'online' : 'offline',
                'and previously was:', wasOnline ? 'online' : 'offline');
    /**
     * Do we want to minimize network usage?  Right now, this is the same as
     * metered, but it's conceivable we might also want to set this if the
     * battery is low, we want to avoid stealing network/cpu from other
     * apps, etc.
     *
     * NB: We used to get this from navigator.connection.metered, but we can't
     * depend on that.
     */
    this.minimizeNetworkUsage = true;
    /**
     * Is there a marginal cost to network usage?  This is intended to be used
     * for UI (decision) purposes where we may want to prompt before doing
     * things when bandwidth is metered, but not when the user is on comparably
     * infinite wi-fi.
     *
     * NB: We used to get this from navigator.connection.metered, but we can't
     * depend on that.
     */
    this.networkCostsMoney = true;

    if (!wasOnline && this.online) {
      // - check if we have any pending actions to run and run them if so.
      for (var iAcct = 0; iAcct < this.accounts.length; iAcct++) {
        this._resumeOpProcessingForAccount(this.accounts[iAcct]);
      }
    }
  },

  /**
   * Helper function to wrap calls to account.runOp for local operations; done
   * only for consistency with `_dispatchServerOpForAccount`.
   */
  _dispatchLocalOpForAccount: function(account, op) {
    var queues = this._opsByAccount[account.id];
    queues.active = true;

    var mode;
    switch (op.lifecycle) {
      case 'do':
        mode = 'local_do';
        op.localStatus = 'doing';
        break;
      case 'undo':
        mode = 'local_undo';
        op.localStatus = 'undoing';
        break;
      default:
        throw new Error('Illegal lifecycle state for local op');
    }

    account.runOp(
      op, mode,
      this._localOpCompleted.bind(this, account, op));
  },

  /**
   * Helper function to wrap calls to account.runOp for server operations since
   * it now gets more complex with 'check' mode.
   */
  _dispatchServerOpForAccount: function(account, op) {
    var queues = this._opsByAccount[account.id];
    queues.active = true;

    var mode = op.lifecycle;
    if (op.serverStatus === 'check')
      mode = 'check';
    op.serverStatus = mode + 'ing';

    account.runOp(
      op, mode,
      this._serverOpCompleted.bind(this, account, op));
  },

  /**
   * Start processing ops for an account if it's able and has ops to run.
   */
  _resumeOpProcessingForAccount: function(account) {
    var queues = this._opsByAccount[account.id];
    if (!account.enabled)
      return;
    // Nothing to do if there's a local op running
    if (!queues.local.length &&
        queues.server.length &&
        // (it's possible there is still an active job right now)
        (queues.server[0].serverStatus !== 'doing' &&
         queues.server[0].serverStatus !== 'undoing')) {
      var op = queues.server[0];
      this._dispatchServerOpForAccount(account, op);
    }
  },

  registerBridge: function(mailBridge) {
    this._bridges.push(mailBridge);
  },

  unregisterBridge: function(mailBridge) {
    var idx = this._bridges.indexOf(mailBridge);
    if (idx !== -1)
      this._bridges.splice(idx, 1);
  },

  tryToCreateAccount: function mu_tryToCreateAccount(userDetails, domainInfo,
                                                     callback) {
    if (!this.online) {
      callback('offline');
      return;
    }

    if (domainInfo) {
      $acctcommon.tryToManuallyCreateAccount(this, userDetails, domainInfo,
                                             callback, this._LOG);
    }
    else {
      // XXX: store configurator on this object so we can abort the connections
      // if necessary.
      var configurator = new $acctcommon.Autoconfigurator(this._LOG);
      configurator.tryToCreateAccount(this, userDetails, callback);
    }
  },

  /**
   * Shutdown the account, forget about it, nuke associated database entries.
   */
  deleteAccount: function(accountId) {
    var savedEx = null;
    var account = this._accountsById[accountId];
    try {
      account.shutdown();
    }
    catch (ex) {
      // save the failure until after we have done other cleanup.
      savedEx = ex;
    }
    this._db.deleteAccount(accountId);

    delete this._accountsById[accountId];
    var idx = this.accounts.indexOf(account);
    this.accounts.splice(idx, 1);

    for (var i = 0; i < account.identities.length; i++) {
      var identity = account.identities[i];
      idx = this.identities.indexOf(identity);
      this.identities.splice(idx, 1);
      delete this._identitiesById[identity.id];
    }

    delete this._opsByAccount[accountId];
    delete this._opCompletionListenersByAccount[accountId];

    this.__notifyRemovedAccount(accountId);

    if (savedEx)
      throw savedEx;
  },

  saveAccountDef: function(accountDef, folderInfo) {
    this._db.saveAccountDef(this.config, accountDef, folderInfo);
  },

  /**
   * Instantiate an account from the persisted representation.
   */
  _loadAccount: function mu__loadAccount(accountDef, folderInfo,
                                         receiveProtoConn) {
    var constructor = $acctcommon.accountTypeToClass(accountDef.type);
    if (!constructor) {
      this._LOG.badAccountType(accountDef.type);
      return null;
    }
    var account = new constructor(this, accountDef, folderInfo, this._db,
                                  receiveProtoConn, this._LOG);

    this.accounts.push(account);
    this._accountsById[account.id] = account;
    this._opsByAccount[account.id] = {
      active: false,
      local: [],
      server: [],
      deferred: []
    };
    this._opCompletionListenersByAccount[account.id] = null;

    for (var iIdent = 0; iIdent < accountDef.identities.length; iIdent++) {
      var identity = accountDef.identities[iIdent];
      this.identities.push(identity);
      this._identitiesById[identity.id] = identity;
    }

    this.__notifyAddedAccount(account);

    // - issue a (non-persisted) syncFolderList if needed
    var timeSinceLastFolderSync = Date.now() - account.meta.lastFolderSyncAt;
    if (timeSinceLastFolderSync >= $syncbase.SYNC_FOLDER_LIST_EVERY_MS)
      this.syncFolderList(account);

    // - check for mutations that still need to be processed
    // This will take care of deferred mutations too because they are still
    // maintained in this list.
    for (var i = 0; i < account.mutations.length; i++) {
      var op = account.mutations[i];
      if (op.lifecycle !== 'done' && op.lifecycle !== 'undone') {
        // For localStatus, we currently expect it to be consistent with the
        // state of the folder's database.  We expect this to be true going
        // forward and as we make changes because when we save the account's
        // operation status, we should also be saving the folder changes at the
        // same time.
        //
        // The same cannot be said for serverStatus, so we need to check.  See
        // comments about operations elsewhere (currently in imap/jobs.js).
        op.serverStatus = 'check';
        this._queueAccountOp(account, op);
      }
    }

    return account;
  },

  /**
   * Self-reporting by an account that it is experiencing difficulties.
   *
   * We mutate its state for it, and generate a notification if this is a new
   * problem.  For problems that require user action, we additionally generate
   * a bad login notification.
   */
  __reportAccountProblem: function(account, problem) {
    // nothing to do if the problem is already known
    if (account.problems.indexOf(problem) !== -1)
      return;
    account.problems.push(problem);
    account.enabled = false;

    this.__notifyModifiedAccount(account);

    switch (problem) {
      case 'bad-user-or-pass':
      case 'imap-disabled':
      case 'needs-app-pass':
        this.__notifyBadLogin(account, problem);
        break;
    }
  },

  __removeAccountProblem: function(account, problem) {
    var idx = account.problems.indexOf(problem);
    if (idx === -1)
      return;
    account.problems.splice(idx, 1);
    account.enabled = (account.problems.length === 0);

    this.__notifyModifiedAccount(account);

    if (account.enabled)
      this._resumeOpProcessingForAccount(account);
  },

  clearAccountProblems: function(account) {
    // TODO: this would be a great time to have any slices that had stalled
    // syncs do whatever it takes to make them happen again.
    account.enabled = true;
    account.problems = [];
    this._resumeOpProcessingForAccount(account);
  },

  __notifyBadLogin: function(account, problem) {
    for (var iBridge = 0; iBridge < this._bridges.length; iBridge++) {
      var bridge = this._bridges[iBridge];
      bridge.notifyBadLogin(account, problem);
    }
  },

  __notifyAddedAccount: function(account) {
    for (var iBridge = 0; iBridge < this._bridges.length; iBridge++) {
      var bridge = this._bridges[iBridge];
      bridge.notifyAccountAdded(account);
    }
  },

  __notifyModifiedAccount: function(account) {
    for (var iBridge = 0; iBridge < this._bridges.length; iBridge++) {
      var bridge = this._bridges[iBridge];
      bridge.notifyAccountModified(account);
    }
  },

  __notifyRemovedAccount: function(accountId) {
    for (var iBridge = 0; iBridge < this._bridges.length; iBridge++) {
      var bridge = this._bridges[iBridge];
      bridge.notifyAccountRemoved(accountId);
    }
  },

  __notifyAddedFolder: function(accountId, folderMeta) {
    for (var iBridge = 0; iBridge < this._bridges.length; iBridge++) {
      var bridge = this._bridges[iBridge];
      bridge.notifyFolderAdded(accountId, folderMeta);
    }
  },

  __notifyModifiedFolder: function(accountId, folderMeta) {
    for (var iBridge = 0; iBridge < this._bridges.length; iBridge++) {
      var bridge = this._bridges[iBridge];
      bridge.notifyFolderModified(accountId, folderMeta);
    }
  },

  __notifyRemovedFolder: function(accountId, folderMeta) {
    for (var iBridge = 0; iBridge < this._bridges.length; iBridge++) {
      var bridge = this._bridges[iBridge];
      bridge.notifyFolderRemoved(accountId, folderMeta);
    }
  },

  //////////////////////////////////////////////////////////////////////////////
  // Lifetime Stuff

  /**
   * Write the current state of the universe to the database.
   */
  saveUniverseState: function() {
    var curTrans = null;

    for (var iAcct = 0; iAcct < this.accounts.length; iAcct++) {
      var account = this.accounts[iAcct];
      curTrans = account.saveAccountState(curTrans);
    }
  },

  /**
   * Shutdown all accounts; this is currently for the benefit of unit testing.
   * We expect our app to operate in a crash-only mode of operation where a
   * clean shutdown means we get a heads-up, put ourselves offline, and trigger a
   * state save before we just demand that our page be closed.  That's future
   * work, of course.
   */
  shutdown: function() {
    for (var iAcct = 0; iAcct < this.accounts.length; iAcct++) {
      var account = this.accounts[iAcct];
      account.shutdown();
    }

    window.removeEventListener('online', this._bound_onConnectionChange);
    window.removeEventListener('offline', this._bound_onConnectionChange);
    this._cronSyncer.shutdown();
    this._db.close();
    this._LOG.__die();
  },

  //////////////////////////////////////////////////////////////////////////////
  // Lookups: Account, Folder, Identity

  getAccountForAccountId: function mu_getAccountForAccountId(accountId) {
    return this._accountsById[accountId];
  },

  /**
   * Given a folder-id, get the owning account.
   */
  getAccountForFolderId: function mu_getAccountForFolderId(folderId) {
    var accountId = folderId.substring(0, folderId.indexOf('/')),
        account = this._accountsById[accountId];
    return account;
  },

  /**
   * Given a message's sufficiently unique identifier, get the owning account.
   */
  getAccountForMessageSuid: function mu_getAccountForMessageSuid(messageSuid) {
    var accountId = messageSuid.substring(0, messageSuid.indexOf('/')),
        account = this._accountsById[accountId];
    return account;
  },

  getFolderStorageForFolderId: function mu_getFolderStorageForFolderId(
                                 folderId) {
    var account = this.getAccountForFolderId(folderId);
    return account.getFolderStorageForFolderId(folderId);
  },

  getFolderStorageForMessageSuid: function mu_getFolderStorageForFolderId(
                                    messageSuid) {
    var folderId = messageSuid.substring(0, messageSuid.lastIndexOf('/')),
        account = this.getAccountForFolderId(folderId);
    return account.getFolderStorageForFolderId(folderId);
  },

  getAccountForSenderIdentityId: function mu_getAccountForSenderIdentityId(
                                   identityId) {
    var accountId = identityId.substring(0, identityId.indexOf('/')),
        account = this._accountsById[accountId];
    return account;
  },

  getIdentityForSenderIdentityId: function mu_getIdentityForSenderIdentityId(
                                    identityId) {
    return this._identitiesById[identityId];
  },

  //////////////////////////////////////////////////////////////////////////////
  // Message Mutation and Undoing

  /**
   * Partitions messages by account.  Accounts may want to partition things
   * further, such as by folder, but we leave that up to them since not all
   * may require it.  (Ex: activesync and gmail may be able to do things
   * that way.)
   */
  _partitionMessagesByAccount: function(messageNamers, targetAccountId) {
    var results = [], acctToMsgs = {};

    for (var i = 0; i < messageNamers.length; i++) {
      var messageNamer = messageNamers[i],
          messageSuid = messageNamer.suid,
          accountId = messageSuid.substring(0, messageSuid.indexOf('/'));
      if (!acctToMsgs.hasOwnProperty(accountId)) {
        var messages = [messageNamer];
        results.push({
          account: this._accountsById[accountId],
          messages: messages,
          crossAccount: (targetAccountId && targetAccountId !== accountId),
        });
        acctToMsgs[accountId] = messages;
      }
      else {
        acctToMsgs[accountId].push(messageNamer);
      }
    }

    return results;
  },

  /**
   * Put an operation in the deferred mutations queue and ensure the deferred
   * operation timer is active.  The deferred queue is persisted to disk too
   * and transferred across to the non-deferred queue at account-load time.
   */
  _deferOp: function(account, op) {
    this._opsByAccount[account.id].deferred.push(op.longtermId);
    if (this._deferredOpTimeout !== null)
      this._deferredOpTimeout = window.setTimeout(
        this._boundQueueDeferredOps, $syncbase.DEFERRED_OP_DELAY_MS);
  },

  /**
   * Enqueue all deferred ops; invoked by the setTimeout scheduled by
   * `_deferOp`.  We use a single timeout across all accounts, so the duration
   * of the defer delay can vary a bit, but our goal is just to avoid deferrals
   * turning into a tight loop that pounds the server, nothing fancier.
   */
  _queueDeferredOps: function() {
    this._deferredOpTimeout = null;
    for (var iAccount = 0; iAccount < this.accounts.length; iAccount++) {
      var account = this.accounts[iAccount],
          queues = this._opsByAccount[account.id];
      // we need to mutate in-place, so concat is not an option
      while (queues.deferred.length) {
        var op = queues.deferred.shift();
        // There is no need to enqueue the operation if:
        // - It's already enqueued because someone called undo
        // - Undo got called and that ran to completion
        if (queues.server.indexOf(op) === -1 &&
            op.lifecycle !== 'undo')
          this._queueAccountOp(account, op);
      }
    }
  },

  _localOpCompleted: function(account, op, err, resultIfAny,
                              accountSaveSuggested) {
    var queues = this._opsByAccount[account.id],
        serverQueue = queues.server,
        localQueue = queues.local;
    queues.active = false;

    var removeFromServerQueue = false;
    if (err) {
      switch (err) {
        // Only defer is currently supported as a recoverable local failure
        // type.
        case 'defer':
          if (++op.tryCount < $syncbase.MAX_OP_TRY_COUNT) {
            this._LOG.opDeferred(op.type, op.longtermId);
            this._deferOp(op);
            removeFromServerQueue = true;
            break;
          }
          // fall-through to an error
        default:
          this._LOG.opGaveUp(op.type, op.longtermId);
          op.localStatus = 'unknown';
          op.serverStatus = 'moot';
          removeFromServerQueue = true;
          break;
      }
    }
    else {
      switch (op.localStatus) {
        case 'doing':
          op.localStatus = 'done';
          break;
        case 'undoing':
          op.localStatus = 'undone';
          break;
      }

      // This is a suggestion; in the event of high-throughput on operations,
      // we probably don't want to save the account every tick, etc.
      if (accountSaveSuggested)
        account.saveAccountState();
    }
    if (removeFromServerQueue) {
      var idx = serverQueue.indexOf(op);
      if (idx !== -1)
        serverQueue.splice(idx, 1);
    }
    localQueue.shift();

    if (localQueue.length) {
      op = localQueue[0];
      this._dispatchLocalOpForAccount(account, op);
    }
    else if (serverQueue.length && this.online && account.enabled) {
      op = serverQueue[0];
      this._dispatchServerOpForAccount(account, op);
    }
  },

  /**
   * @args[
   *   @param[account[
   *   @param[op]{
   *     The operation.
   *   }
   *   @param[err @oneof[
   *     @case[null]{
   *       Success!
   *     }
   *     @case['defer']{
   *       The resource was unavailable, but might be available again in the
   *       future.  Defer the operation to be run in the future by putting it on
   *       a deferred list that will get re-added after an arbitrary timeout.
   *       This does not imply that a check operation needs to be run.  This
   *       reordering violates our general ordering guarantee; we could be
   *       better if we made sure to defer all other operations that can touch
   *       the same resource, but that's pretty complex.
   *
   *       Deferrals do boost the tryCount; our goal with implementing this is
   *       to support very limited
   *     }
   *     @case['aborted-retry']{
   *       The operation was started, but we lost the connection before we
   *       managed to accomplish our goal.  Run a check operation then run the
   *       operation again depending on what 'check' says.
   *
   *       'defer' should be used instead if it's known that no mutations could
   *       have been perceived by the server, etc.
   *     }
   *     @case['failure-give-up']{
   *       Something is broken in a way we don't really understand and it's
   *       unlikely that retrying is actually going to accomplish anything.
   *       Although we mark the status 'moot', this is a more sinister failure
   *       that should generate debugging/support data when appropriate.
   *     }
   *     @case['moot']{
   *       The operation no longer makes any sense.
   *     }
   *     @default{
   *       Some other type of error occurred.  This gets treated the same as
   *       aborted-retry
   *     }
   *   ]]
   *   @param[resultIfAny]{
   *     A result to be relayed to the listening callback for the operation, if
   *     there is one.  This is intended to be used for things like triggering
   *     attachment downloads where it would be silly to make the callback
   *     re-get the changed data itself.
   *   }
   *   @param[accountSaveSuggested #:optional Boolean]{
   *     Used to indicate that this has changed the state of the system and a
   *     save should be performed at some point in the future.
   *   }
   * ]
   */
  _serverOpCompleted: function(account, op, err, resultIfAny,
                               accountSaveSuggested) {
    var queues = this._opsByAccount[account.id],
        serverQueue = queues.server,
        localQueue = queues.local;
    queues.active = false;

    if (serverQueue[0] !== op)
      this._LOG.opInvariantFailure();

    // Should we attempt to retry (but fail if tryCount is reached)?
    var maybeRetry = false;
    // Pop the event off the queue? (avoid bugs versus multiple calls)
    var consumeOp = true;
    // Generate completion notifications for the op?
    var completeOp = true;
    if (err) {
      switch (err) {
        case 'defer':
          if (++op.tryCount < $syncbase.MAX_OP_TRY_COUNT) {
            // Defer the operation if we still want to do the thing, but skip
            // deferring if we are now trying to undo the thing.
            if (op.serverStatus === 'doing' && op.lifecycle === 'do') {
              this._LOG.opDeferred(op.type, op.longtermId);
              this._deferOp(op);
            }
            // remove the op from the queue, but don't mark it completed
            completeOp = false;
          }
          else {
            op.serverStatus = 'moot';
          }
          break;
        case 'aborted-retry':
          op.tryCount++;
          maybeRetry = true;
          break;
        default: // (unknown case)
          op.tryCount += $syncbase.OP_UNKNOWN_ERROR_TRY_COUNT_INCREMENT;
          maybeRetry = true;
          break;
        case 'failure-give-up':
          this._LOG.opGaveUp(op.type, op.longtermId);
          // we complete the op, but the error flag is propagated
          op.serverStatus = 'moot';
          break;
        case 'moot':
          this._LOG.opMooted(op.type, op.longtermId);
          // we complete the op, but the error flag is propagated
          op.serverStatus = 'moot';
          break;
      }
    }
    else {
      switch (op.serverStatus) {
        case 'checking':
          // Update the status, and figure out if there is any work to do based
          // on our desire.
          switch (resultIfAny) {
            case 'checked-notyet':
            case 'coherent-notyet':
              op.serverStatus = null;
              break;
            case 'idempotent':
              if (op.lifecycle === 'do' || op.lifecycle === 'done')
                op.serverStatus = null;
              else
                op.serverStatus = 'done';
              break;
            case 'happened':
              op.serverStatus = 'done';
              break;
            case 'moot':
              op.serverStatus = 'moot';
              break;
            // this is the same thing as defer.
            case 'bailed':
              this._LOG.opDeferred(op.type, op.longtermId);
              this._deferOp(op);
              completeOp = false;
              break;
          }
          break;
        case 'doing':
          op.serverStatus = 'done';
          // lifecycle may have changed to 'undo'; don't mutate if so
          if (op.lifecycle === 'do')
            op.lifecycle = 'done';
          break;
        case 'undoing':
          op.serverStatus = 'undone';
          // this will always be true until we gain 'redo' functionality
          if (op.lifecycle === 'undo')
            op.lifecycle = 'undone';
          break;
      }
      // If we still want to do something, then don't consume the op.
      if (op.lifecycle === 'do' || op.lifecycle === 'undo')
        consumeOp = false;
    }

    if (maybeRetry) {
      if (op.tryCount < $syncbase.MAX_OP_TRY_COUNT) {
        // We're still good to try again, but we will need to check the status
        // first.
        op.serverStatus = 'check';
        consumeOp = false;
      }
      else {
        this._LOG.opTryLimitReached(op.type, op.longtermId);
        // we complete the op, but the error flag is propagated
        op.serverStatus = 'moot';
      }
    }

    if (consumeOp)
      serverQueue.shift();

    if (completeOp) {
      if (this._opCallbacks.hasOwnProperty(op.longtermId)) {
        var callback = this._opCallbacks[op.longtermId];
        delete this._opCallbacks[op.longtermId];
        try {
          callback(err, resultIfAny, account, op);
        }
        catch(ex) {
          this._LOG.opCallbackErr(op.type);
        }
      }

      // This is a suggestion; in the event of high-throughput on operations,
      // we probably don't want to save the account every tick, etc.
      if (accountSaveSuggested)
        account.saveAccountState();
    }

    if (localQueue.length) {
      op = localQueue[0];
      this._dispatchLocalOpForAccount(account, op);
    }
    else if (serverQueue.length && this.online && account.enabled) {
      op = serverQueue[0];
      this._dispatchServerOpForAccount(account, op);
    }
    else if (this._opCompletionListenersByAccount[account.id]) {
      this._opCompletionListenersByAccount[account.id](account);
      this._opCompletionListenersByAccount[account.id] = null;
    }
  },

  /**
   * Enqueue an operation for processing.  The local mutation is enqueued if it
   * has not yet been run.  The server piece is always enqueued.
   *
   * @args[
   *   @param[account]
   *   @param[op]
   *   @param[optionalCallback #:optional Function]{
   *     A callback to invoke when the operation completes.  Callbacks are
   *     obviously not capable of being persisted and are merely best effort.
   *   }
   *   @param[justRequeue #:optional Boolean]{
   *     If true, we are just re-enqueueing the operation and have no desire
   *     or need to run the local operations.
   *   }
   * ]
   */
  _queueAccountOp: function(account, op, optionalCallback) {
    // - Name the op, register callbacks
    if (op.longtermId === null) {
      op.longtermId = account.id + '/' +
                        $a64.encodeInt(account.meta.nextMutationNum++);
      account.mutations.push(op);
      while (account.mutations.length > MAX_MUTATIONS_FOR_UNDO &&
             (account.mutations[0].lifecycle === 'done') ||
             (account.mutations[0].lifecycle === 'undone')) {
        account.mutations.shift();
      }
    }
    if (optionalCallback)
      this._opCallbacks[op.longtermId] = optionalCallback;

    // - Enqueue
    var queues = this._opsByAccount[account.id];
    // Local processing needs to happen if we're not in the right local state.
    if (!this._testModeDisablingLocalOps &&
        ((op.lifecycle === 'do' && op.localStatus === null) ||
         (op.lifecycle === 'undo' && op.localStatus !== 'undone' &&
          op.localStatus !== 'unknown')))
      queues.local.push(op);
    // Server processing is always needed
    queues.server.push(op);

    // If there is already something active, don't do anything!
    if (queues.active) {
    }
    else if (queues.local.length) {
      // Only actually dispatch if there is only the op we just (maybe).
      if (queues.local.length === 1 && queues.local[0] === op)
        this._dispatchLocalOpForAccount(account, op);
      else
        console.log('local active! not running!');
      // else: we grabbed control flow to avoid the server queue running
    }
    else if (queues.server.length === 1 && this.online && account.enabled) {
      this._dispatchServerOpForAccount(account, op);
    }

    return op.longtermId;
  },

  waitForAccountOps: function(account, callback) {
    var queues = this._opsByAccount[account.id];
    if (queues.local.length === 0 &&
        queues.server.length === 0)
      callback();
    else
      this._opCompletionListenersByAccount[account.id] = callback;
  },

  syncFolderList: function(account, callback) {
    this._queueAccountOp(
      account,
      {
        type: 'syncFolderList',
        // no need to track this in the mutations list
        longtermId: 'internal',
        lifecycle: 'do',
        localStatus: 'done',
        serverStatus: null,
        tryCount: 0,
        humanOp: 'syncFolderList'
      },
      callback);
  },

  /**
   * Schedule a purge of the excess messages from the given folder.  This
   * currently only makes sense for IMAP accounts and will automatically be
   * called by the FolderStorage and its owning account when a sufficient
   * number of blocks have been allocated by the storage.
   */
  purgeExcessMessages: function(account, folderId, callback) {
    this._queueAccountOp(
      account,
      {
        type: 'purgeExcessMessages',
        // no need to track this in the mutations list
        longtermId: 'internal',
        lifecycle: 'do',
        localStatus: null,
        serverStatus: null,
        tryCount: 0,
        humanOp: 'purgeExcessMessages',
        folderId: folderId
      },
      callback);
  },

  /**
   * Download one or more related-part or attachments from a message.
   * Attachments are named by their index because the indices are stable and
   * flinging around non-authoritative copies of the structures might lead to
   * some (minor) confusion.
   *
   * This request is persistent although the callback will obviously be
   * discarded in the event the app is killed.
   */
  downloadMessageAttachments: function(messageSuid, messageDate,
                                       relPartIndices, attachmentIndices,
                                       callback) {
    var account = this.getAccountForMessageSuid(messageSuid);
    var longtermId = this._queueAccountOp(
      account,
      {
        type: 'download',
        longtermId: null,
        lifecycle: 'do',
        localStatus: null,
        serverStatus: null,
        tryCount: 0,
        humanOp: 'download',
        messageSuid: messageSuid,
        messageDate: messageDate,
        relPartIndices: relPartIndices,
        attachmentIndices: attachmentIndices
      },
      callback);
  },

  modifyMessageTags: function(humanOp, messageSuids, addTags, removeTags) {
    var self = this, longtermIds = [];
    this._partitionMessagesByAccount(messageSuids, null).forEach(function(x) {
      var longtermId = self._queueAccountOp(
        x.account,
        {
          type: 'modtags',
          longtermId: null,
          lifecycle: 'do',
          localStatus: null,
          serverStatus: null,
          tryCount: 0,
          humanOp: humanOp,
          messages: x.messages,
          addTags: addTags,
          removeTags: removeTags,
          // how many messages have had their tags changed already.
          progress: 0,
        });
      longtermIds.push(longtermId);
    });
    return longtermIds;
  },

  moveMessages: function(messageSuids, targetFolderId) {
    var self = this, longtermIds = [],
        targetFolderAccount = this.getAccountForFolderId(targetFolderId);
    this._partitionMessagesByAccount(messageSuids, null).forEach(function(x) {
      // TODO: implement cross-account moves and then remove this constraint
      // and instead schedule the cross-account move.
      if (x.account !== targetFolderAccount)
        throw new Error('cross-account moves not currently supported!');
      var longtermId = self._queueAccountOp(
        x.account,
        {
          type: 'move',
          longtermId: null,
          lifecycle: 'do',
          localStatus: null,
          serverStatus: null,
          tryCount: 0,
          humanOp: 'move',
          messages: x.messages,
          targetFolder: targetFolderId,
        });
      longtermIds.push(longtermId);
    });
    return longtermIds;
  },

  deleteMessages: function(messageSuids) {
    var self = this, longtermIds = [];
    this._partitionMessagesByAccount(messageSuids, null).forEach(function(x) {
      var longtermId = self._queueAccountOp(
        x.account,
        {
          type: 'delete',
          longtermId: null,
          lifecycle: 'do',
          localStatus: null,
          serverStatus: null,
          tryCount: 0,
          humanOp: 'delete',
          messages: x.messages
        });
      longtermIds.push(longtermId);
    });
    return longtermIds;
  },

  appendMessages: function(folderId, messages) {
    var account = this.getAccountForFolderId(folderId);
    var longtermId = this._queueAccountOp(
      account,
      {
        type: 'append',
        longtermId: null,
        lifecycle: 'do',
        localStatus: null,
        serverStatus: null,
        tryCount: 0,
        humanOp: 'append',
        messages: messages,
        folderId: folderId,
      });
    return [longtermId];
  },

  /**
   * Create a folder that is the child/descendant of the given parent folder.
   * If no parent folder id is provided, we attempt to create a root folder.
   *
   * This is not implemented as a job 'operation' because our UX spec does not
   * call for this to be an undoable operation, nor do we particularly want the
   * potential permutations of having offline folders that the server does not
   * know about.
   *
   * @args[
   *   @param[accountId]
   *   @param[parentFolderId @oneof[null String]]{
   *     If null, place the folder at the top-level, otherwise place it under
   *     the given folder.
   *   }
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
   *         @case['moot']{
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
  createFolder: function(accountId, parentFolderId, folderName,
                         containOnlyOtherFolders, callback) {
    var account = this.getAccountForAccountId(accountId);
    var longtermId = this._queueAccountOp(
      account,
      {
        type: 'createFolder',
        longtermId: null,
        lifecycle: 'do',
        localStatus: null,
        serverStatus: null,
        tryCount: 0,
        humanOp: 'createFolder',
        parentFolderId: parentFolderId,
        folderName: folderName,
        containOnlyOtherFolders: containOnlyOtherFolders
      },
      callback);
    return [longtermId];
  },

  /**
   * Idempotently trigger the undo logic for the performed operation.  Calling
   * undo on an operation that is already undone/slated for undo has no effect.
   */
  undoMutation: function(longtermIds) {
    for (var i = 0; i < longtermIds.length; i++) {
      var longtermId = longtermIds[i],
          account = this.getAccountForFolderId(longtermId), // (it's fine)
          queues = this._opsByAccount[account.id];

      for (var iOp = 0; iOp < account.mutations.length; iOp++) {
        var op = account.mutations[iOp];
        if (op.longtermId === longtermId) {
          // There is nothing to do if we have already processed the request or
          // or the op has already been fully undone.
          if (op.lifecycle === 'undo' || op.lifecycle === 'undone') {
            continue;
          }

          // Queue an undo operation if we're already done.
          if (op.lifecycle === 'done') {
            op.lifecycle = 'undo';
            this._queueAccountOp(account, op);
            continue;
          }
          // else op.lifecycle === 'do'

          // If we have not yet started processing the operation, we can
          // simply remove the operation from the local queue.
          var idx = queues.local.indexOf(op);
          if (idx !== -1) {
              op.lifecycle = 'undone';
              queues.local.splice(idx, 1);
              continue;
          }
          // (the operation must have already been run locally, which means
          // that at the very least we need to local_undo, so queue it.)

          op.lifecycle = 'undo';
          this._queueAccountOp(account, op);
        }
      }
    }
  },

  //////////////////////////////////////////////////////////////////////////////
};

var LOGFAB = exports.LOGFAB = $log.register($module, {
  MailUniverse: {
    type: $log.ACCOUNT,
    events: {
      configCreated: {},
      configMigrating: {},
      configLoaded: {},
      createAccount: { type: true, id: false },
      opDeferred: { type: true, id: false },
      opTryLimitReached: { type: true, id: false },
      opGaveUp: { type: true, id: false },
      opMooted: { type: true, id: false },
    },
    TEST_ONLY_events: {
      configCreated: { config: false },
      configMigrating: { lazyCarryover: false },
      configLoaded: { config: false, accounts: false },
      createAccount: { name: false },
    },
    errors: {
      badAccountType: { type: true },
      opCallbackErr: { type: false },
      opInvariantFailure: {},
    },
  },
});

}); // end define
