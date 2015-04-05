/**
 *
 **/
/*global define, console, window, Blob */
define(
  [
    'logic',
    './a64',
    './date',
    './syncbase',
    './worker-router',
    './maildb',
    './cronsync',
    './accountcommon',
    './allback',
    'module',
    'exports'
  ],
  function(
    logic,
    $a64,
    $date,
    $syncbase,
    $router,
    $maildb,
    $cronsync,
    $acctcommon,
    $allback,
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
var MAX_MUTATIONS_FOR_UNDO = 10;

/**
 * When debug logging is enabled, how long should we store logs in the
 * circular buffer?
 */
var MAX_LOG_BACKLOG_MS = 30000;

/**
 * Creates a method to add to MailUniverse that calls a method
 * on all bridges.
 * @param  {String} bridgeMethod name of bridge method to call
 * @return {Function} function to attach to MailUniverse. Assumes
 * "this" is the MailUniverse instance, and that up to three args
 * are passed to the method.
 */
function makeBridgeFn(bridgeMethod) {
  return function(a1, a2, a3) {
    for (var iBridge = 0; iBridge < this._bridges.length; iBridge++) {
      var bridge = this._bridges[iBridge];
      bridge[bridgeMethod](a1, a2, a3);
    }
  };
}

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
 *   @key[type @oneof['pop3+smtp' 'imap+smtp' 'activesync']]
 *   @key[receiveType @oneof['pop3' 'imap' 'activesync']]
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
 *     @case['moot']{
 *       Either the local or server operation failed and mooted the operation.
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
 *     @case['n/a']{
 *       The op does not need to be run online.
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
function MailUniverse(callAfterBigBang, online, testOptions) {
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

  this._testModeDisablingLocalOps = false;
  /** Fake navigator to use for navigator.onLine checks */
  this._testModeFakeNavigator = (testOptions && testOptions.fakeNavigator) ||
                                null;

  // We used to try and use navigator.connection, but it's not supported on B2G,
  // so we have to use navigator.onLine like suckers.
  this.online = true; // just so we don't cause an offline->online transition
  // Events for online/offline are now pushed into us externally.  They need
  // to be bridged from the main thread anyways, so no point faking the event
  // listener.
  this._onConnectionChange(online);

  // Track the mode of the universe. Values are:
  // 'cron': started up in background to do tasks like sync.
  // 'interactive': at some point during its life, it was used to
  // provide functionality to a user interface. Once it goes
  // 'interactive', it cannot switch back to 'cron'.
  this._mode = 'cron';

  /**
   * A setTimeout handle for when we next dump deferred operations back onto
   * their operation queues.
   */
  this._deferredOpTimeout = null;
  this._boundQueueDeferredOps = this._queueDeferredOps.bind(this);

  this.config = null;
  this._logBacklog = [];

  this._db = new $maildb.MailDB(testOptions);
  this._cronSync = null;
  var self = this;
  this._db.getConfig(function(configObj, accountInfos, lazyCarryover) {
    function setupLogging(config) {

      // To avoid being overly verbose, and to avoid revealing private
      // information in logs (unless we've explicitly enabled it), we censor
      // event details when in secretDebugMode and for console logs.
      function censorLogs() {
        logic.isCensored = true;

        function censorValue(value) {
          if (value && (value.suid || value.srvid)) {
            return {
              date: value.date,
              suid: value.suid,
              srvid: value.srvid
            };
          } else if (value && typeof value === 'object') {
            return value.toString();
          } else {
            return value;
          }
        }

        // We:
        //   - Remove properties starting with an underscore.
        //   - Process one level of Arrays.
        //   - Allow primitives to pass through.
        //   - Objects get stringified unless they are a mail header,
        //     in which case we return just the date/suid/srvid.
        logic.on('censorEvent', function(e) {
          if (logic.isPlainObject(e.details)) {
            for (var key in e.details) {
              var value = e.details[key];
              if (key[0] === '_') {
                delete e.details[key];
              } else if (Array.isArray(value)) {
                // Include one level of arrays.
                e.details[key] = value.map(censorValue);
              } else {
                e.details[key] = censorValue(value);
              }
            }
          }
        });
      }

      if (self.config.debugLogging) {

        if (self.config.debugLogging === 'realtime-dangerous') {
          console.warn('!!!');
          console.warn('!!! REALTIME USER-DATA ENTRAINING LOGGING ENABLED !!!');
          console.warn('!!!');
          console.warn('You are about to see a lot of logs, as they happen!');
          console.warn('They will also be circularly buffered for saving.');
          console.warn('');
          console.warn('These logs will contain SENSITIVE DATA.  The CONTENTS');
          console.warn('OF EMAILS, maybe some PASSWORDS.  This was turned on');
          console.warn('via the secret debug mode UI.  Use it to turn us off:');
          console.warn('https://wiki.mozilla.org/Gaia/Email/SecretDebugMode');
          logic.realtimeLogEverything = true;
        }
        else if (self.config.debugLogging !== 'dangerous') {
          console.warn('GENERAL LOGGING ENABLED!');
          console.warn('(CIRCULAR EVENT LOGGING WITH NON-SENSITIVE DATA)');
          censorLogs();
        }
        else {
          console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
          console.warn('DANGEROUS USER-DATA ENTRAINING LOGGING ENABLED !!!');
          console.warn('!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!!');
          console.warn('This means contents of e-mails and passwords if you');
          console.warn('set up a new account.  (The IMAP protocol sanitizes');
          console.warn('passwords, but the bridge logger may not.)');
          console.warn('');
          console.warn('If you forget how to turn us off, see:');
          console.warn('https://wiki.mozilla.org/Gaia/Email/SecretDebugMode');
          console.warn('...................................................');
        }
      } else if (!logic.underTest) {
        censorLogs();

        var NAMESPACES_TO_ALWAYS_LOG = [
          'BrowserBox',
          'SmtpClient',
          'ActivesyncConfigurator',
          'ImapFolderSync',
          'Pop3Prober',
          'Autoconfigurator',
          'DisasterRecovery',
          'ImapClient',
          'ImapJobDriver',
          'Oauth',
          'Pop3FolderSyncer',
          'SmtpProber'
        ];

        // If we don't have debug logging enabled, bail out early by
        // short-circuiting any events that wouldn't be logged anyway.
        logic.on('preprocessEvent', function(e) {
          var eventShouldBeLogged = (
            NAMESPACES_TO_ALWAYS_LOG.indexOf(e.namespace) !== -1 ||
            // The smtp portion uses a namespace of 'Account', but we want it.
            (e.namespace === 'Account' &&
             e.details && e.details.accountType === 'smtp') ||
            // We also want these.
            e.type === 'allOpsCompleted' ||
            e.type === 'mailslice:mutex-released'
          );

          if (!eventShouldBeLogged) {
            e.preventDefault();
          }
        });

        // Then, since only the logs we care about make it this far, we can log
        // all remaining events here.
        logic.on('event', function(e) {
          var obj = e.toJSON();
          dump('[' + obj.namespace + '] ' + obj.type +
               '  ' + JSON.stringify(obj.details) + '\n');
        });
      }
    }

    var accountInfo, i;
    var doneCount = 0;
    var accountCount = accountInfos.length;
    if (configObj) {
      self.config = configObj;
      setupLogging();

      logic.defineScope(self, 'MailUniverse');

      if (self.config.debugLogging)
        self._enableCircularLogging();

      logic(self, 'configLoaded',
            { config: self.config, accountInfos: accountInfos });

      function done() {
        doneCount += 1;
        if (doneCount === accountCount) {
          self._initFromConfig();
          callAfterBigBang();
        }
      }

      if (accountCount) {
        for (i = 0; i < accountCount; i++) {
          accountInfo = accountInfos[i];
          self._loadAccount(accountInfo.def, accountInfo.folderInfo,
                            null, done);
        }

        // return since _loadAccount needs to finish before completing
        // the flow in done().
        return;
      }
    }
    else {
      self.config = {
        // We need to put the id in here because our startup query can't
        // efficiently get both the key name and the value, just the values.
        id: 'config',
        nextAccountNum: 0,
        nextIdentityNum: 0,
        debugLogging: lazyCarryover ? lazyCarryover.config.debugLogging : false
      };
      setupLogging();

      logic.defineScope(self, 'MailUniverse');

      if (self.config.debugLogging)
        self._enableCircularLogging();
      self._db.saveConfig(self.config);

      // - Try to re-create any accounts using old account infos.
      if (lazyCarryover) {
        logic(self, 'configMigrating_begin', { lazyCarryover: lazyCarryover });
        var waitingCount = lazyCarryover.accountInfos.length;
        var oldVersion = lazyCarryover.oldVersion;

        var accountRecreated = function(accountInfo, err) {
          logic(self, 'recreateAccount_end',
                { type: accountInfo.type,
                  id: accountInfo.id,
                  error: err });
          // We don't care how they turn out, just that they get a chance
          // to run to completion before we call our bootstrap complete.
          if (--waitingCount === 0) {
            logic(self, 'configMigrating_end');
            this._initFromConfig();
            callAfterBigBang();
          }
        };

        for (i = 0; i < lazyCarryover.accountInfos.length; i++) {
          var accountInfo = lazyCarryover.accountInfos[i];
          logic(this, 'recreateAccount_begin',
                { type: accountInfo.type,
                  id: accountInfo.id,
                  error: null });
          $acctcommon.recreateAccount(
            self, oldVersion, accountInfo,
            accountRecreated.bind(this, accountInfo));
        }
        // Do not let callAfterBigBang get called.
        return;
      }
      else {
        logic(self, 'configCreated', { config: self.config });
      }
    }
    self._initFromConfig();
    callAfterBigBang();
  }.bind(this));
}
exports.MailUniverse = MailUniverse;
MailUniverse.prototype = {
  //////////////////////////////////////////////////////////////////////////////
  // Logging
  _enableCircularLogging: function() {
    this._logBacklog = [];
    logic.on('event', (event) => {
      this._logBacklog.push(event.toJSON());
      // Remove any events we've kept for longer than MAX_LOG_BACKLOG_MS.
      var oldestTimeAllowed = Date.now() - MAX_LOG_BACKLOG_MS;
      while (this._logBacklog.length &&
             this._logBacklog[0].time < oldestTimeAllowed) {
        this._logBacklog.shift();
      }
    });
  },

  createLogBacklogRep: function() {
    return {
      type: 'logic',
      events: this._logBacklog
    };
  },

  dumpLogToDeviceStorage: function() {
    // This reuses the existing registration if one exists.
    var sendMessage = $router.registerCallbackType('devicestorage');
    try {
      var blob = new Blob([JSON.stringify(this.createLogBacklogRep())],
                          {
                            type: 'application/json',
                            endings: 'transparent'
                          });
      var filename = 'gem-log-' + Date.now() + '.json';
      sendMessage('save', ['sdcard', blob, filename], function(success, err, savedFile) {
        if (success)
          console.log('saved log to "sdcard" devicestorage:', savedFile);
        else
          console.error('failed to save log to', filename);

      });
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
    this._cronSync = new $cronsync.CronSync(this);
  },

  /**
   * Return the subset of our configuration that the client can know about.
   */
  exposeConfigForClient: function() {
    // eventually, iterate over a whitelist, but for now, it's easy...
    return {
      debugLogging: this.config.debugLogging
    };
  },

  modifyConfig: function(changes) {
    for (var key in changes) {
      var val = changes[key];
      switch (key) {
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

  setInteractive: function() {
    this._mode = 'interactive';
  },

  //////////////////////////////////////////////////////////////////////////////
  _onConnectionChange: function(isOnline) {
    var wasOnline = this.online;
    /**
     * Are we online?  AKA do we have actual internet network connectivity.
     * This should ideally be false behind a captive portal.  This might also
     * end up temporarily false if we move to a 2-phase startup process.
     */
    this.online = this._testModeFakeNavigator ?
                    this._testModeFakeNavigator.onLine : isOnline;
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

  /**
   * Return true if there are server jobs that are currently running or will run
   * imminently.
   *
   * It's possible for this method to be called during the cleanup stage of the
   * last job in the queue.  It was intentionally decided to not try and be
   * clever in that case because the job could want to be immediately
   * rescheduled.  Also, propagating the data to do that turned out to involve a
   * lot of sketchy manual propagation.
   *
   * If you have some logic you want to trigger when the server jobs have
   * all been sufficiently used up, you can use `waitForAccountOps`  or add
   * logic to the account's `allOperationsCompleted` method.
   */
  areServerJobsWaiting: function(account) {
    var queues = this._opsByAccount[account.id];
    if (!account.enabled) {
      return false;
    }
    return !!queues.server.length;
  },

  registerBridge: function(mailBridge) {
    this._bridges.push(mailBridge);
  },

  unregisterBridge: function(mailBridge) {
    var idx = this._bridges.indexOf(mailBridge);
    if (idx !== -1)
      this._bridges.splice(idx, 1);
  },

  learnAboutAccount: function(details) {
    var configurator = new $acctcommon.Autoconfigurator();
    return configurator.learnAboutAccount(details);
  },

  tryToCreateAccount: function mu_tryToCreateAccount(userDetails, domainInfo,
                                                     callback) {
    if (!this.online) {
      callback('offline');
      return;
    }
    if (!userDetails.forceCreate) {
      for (var i = 0; i < this.accounts.length; i++) {
        if (userDetails.emailAddress ===
            this.accounts[i].identities[0].address) {
          callback('user-account-exists');
          return;
        }
      }
    }

    if (domainInfo) {
      $acctcommon.tryToManuallyCreateAccount(this, userDetails, domainInfo,
                                             callback);
    }
    else {
      // XXX: store configurator on this object so we can abort the connections
      // if necessary.
      var configurator = new $acctcommon.Autoconfigurator();
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
      account.accountDeleted();
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

  saveAccountDef: function(accountDef, folderInfo, callback) {
    this._db.saveAccountDef(this.config, accountDef, folderInfo, callback);
    var account = this.getAccountForAccountId(accountDef.id);

    // Make sure syncs are still accurate, since syncInterval
    // could have changed.
    if (this._cronSync) {
      this._cronSync.ensureSync();
    }

    // If account exists, notify of modification. However on first
    // save, the account does not exist yet.
    if (account)
      this.__notifyModifiedAccount(account);
  },

  /**
   * Instantiate an account from the persisted representation.
   * Asynchronous. Calls callback with the account object.
   */
  _loadAccount: function mu__loadAccount(accountDef, folderInfo,
                                         receiveProtoConn, callback) {
    $acctcommon.accountTypeToClass(accountDef.type, function (constructor) {
      if (!constructor) {
        logic(this, 'badAccountType', { type: accountDef.type });
        return;
      }
      var account = new constructor(this, accountDef, folderInfo, this._db,
                                    receiveProtoConn);

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
        if (op.lifecycle !== 'done' && op.lifecycle !== 'undone' &&
            op.lifecycle !== 'moot') {
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
      account.upgradeFolderStoragesIfNeeded();
      callback(account);
    }.bind(this));
  },

  /**
   * Self-reporting by an account that it is experiencing difficulties.
   *
   * We mutate its state for it, and generate a notification if this is a new
   * problem.  For problems that require user action, we additionally generate
   * a bad login notification.
   *
   * @param account
   * @param {string} problem
   * @param {'incoming'|'outgoing'} whichSide
   */
  __reportAccountProblem: function(account, problem, whichSide) {
    var suppress = false;
    // nothing to do if the problem is already known
    if (account.problems.indexOf(problem) !== -1) {
      suppress = true;
    }
    logic(this, 'reportProblem',
          { problem: problem, suppress: suppress, accountId: account.id });
    if (suppress) {
      return;
    }

    account.problems.push(problem);
    account.enabled = false;

    this.__notifyModifiedAccount(account);

    switch (problem) {
      case 'bad-user-or-pass':
      case 'needs-oauth-reauth':
      case 'bad-address':
      case 'imap-disabled':
        this.__notifyBadLogin(account, problem, whichSide);
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
    logic(this, 'clearAccountProblems', { accountId: account.id });
    // TODO: this would be a great time to have any slices that had stalled
    // syncs do whatever it takes to make them happen again.
    account.enabled = true;
    account.problems = [];
    this._resumeOpProcessingForAccount(account);
  },

  // expects (account, problem, whichSide)
  __notifyBadLogin: makeBridgeFn('notifyBadLogin'),

  // expects (account)
  __notifyAddedAccount: makeBridgeFn('notifyAccountAdded'),

  // expects (account)
  __notifyModifiedAccount: makeBridgeFn('notifyAccountModified'),

  // expects (accountId)
  __notifyRemovedAccount: makeBridgeFn('notifyAccountRemoved'),

  // expects (account, folderMeta)
  __notifyAddedFolder: makeBridgeFn('notifyFolderAdded'),

  // expects (account, folderMeta)
  __notifyModifiedFolder: makeBridgeFn('notifyFolderModified'),

  // expects (account, folderMeta)
  __notifyRemovedFolder: makeBridgeFn('notifyFolderRemoved'),

  // expects (suid, detail, body)
  __notifyModifiedBody: makeBridgeFn('notifyBodyModified'),


  //////////////////////////////////////////////////////////////////////////////
  // cronsync Stuff

  // expects (accountIds)
  __notifyStartedCronSync: makeBridgeFn('notifyCronSyncStart'),

  // expects (accountsResults)
  __notifyStoppedCronSync: makeBridgeFn('notifyCronSyncStop'),

  // __notifyBackgroundSendStatus expects {
  //   suid: messageSuid,
  //   accountId: accountId,
  //   sendFailures: (integer),
  //   state: 'pending', 'sending', 'error', 'success', or 'syncDone'
  //   emitNotifications: Boolean,
  //   err: (if applicable),
  //   badAddresses: (if applicable)
  // }
  __notifyBackgroundSendStatus: makeBridgeFn('notifyBackgroundSendStatus'),

  //////////////////////////////////////////////////////////////////////////////
  // Lifetime Stuff

  /**
   * Write the current state of the universe to the database.
   */
  saveUniverseState: function(callback) {
    var curTrans = null;
    var latch = $allback.latch();

    logic(this, 'saveUniverseState_begin');
    for (var iAcct = 0; iAcct < this.accounts.length; iAcct++) {
      var account = this.accounts[iAcct];
      curTrans = account.saveAccountState(curTrans, latch.defer(account.id),
                                          'saveUniverse');
    }
    latch.then(function() {
      logic(this, 'saveUniverseState_end');
      if (callback) {
        callback();
      };
    }.bind(this));
  },

  /**
   * Shutdown all accounts; this is currently for the benefit of unit testing.
   * We expect our app to operate in a crash-only mode of operation where a
   * clean shutdown means we get a heads-up, put ourselves offline, and trigger a
   * state save before we just demand that our page be closed.  That's future
   * work, of course.
   *
   * If a callback is provided, a cleaner shutdown will be performed where we
   * wait for all current IMAP connections to be be shutdown by the server
   * before invoking the callback.
   */
  shutdown: function(callback) {
    var waitCount = this.accounts.length;
    // (only used if a 'callback' is passed)
    function accountShutdownCompleted() {
      if (--waitCount === 0)
        callback();
    }
    for (var iAcct = 0; iAcct < this.accounts.length; iAcct++) {
      var account = this.accounts[iAcct];
      // only need to pass our handler if clean shutdown is desired
      account.shutdown(callback ? accountShutdownCompleted : null);
    }

    if (this._cronSync) {
      this._cronSync.shutdown();
    }
    this._db.close();

    if (!this.accounts.length)
      callback();
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

    // If not in 'interactive' mode, then this is just a short
    // 'cron' existence that needs to shut down soon. Wait one
    // more cycle in case the app switches over to 'interactive'
    // in the meantime.
    if (this._mode !== 'interactive') {
      console.log('delaying deferred op since mode is ' + this._mode);
      this._deferredOpTimeout = window.setTimeout(
        this._boundQueueDeferredOps, $syncbase.DEFERRED_OP_DELAY_MS);
      return;
    }

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

  /**
   * A local op finished; figure out what the error means, perform any requested
   * saves, and *only after the saves complete*, issue any appropriate callback
   * and only then start the next op.
   */
  _localOpCompleted: function(account, op, err, resultIfAny,
                              accountSaveSuggested) {

    var queues = this._opsByAccount[account.id],
        serverQueue = queues.server,
        localQueue = queues.local;

    var removeFromServerQueue = false,
        completeOp = false,
        wasMode = 'local_' + op.localStatus.slice(0, -3);
    if (err) {
      switch (err) {
        // Only defer is currently supported as a recoverable local failure
        // type.
        case 'defer':
          if (++op.tryCount < $syncbase.MAX_OP_TRY_COUNT) {
            logic(this, 'opDeferred', { type: op.type,
                                        longtermId: op.longtermId });
            this._deferOp(account, op);
            removeFromServerQueue = true;
            break;
          }
          // fall-through to an error
        default:
          logic(this, 'opGaveUp', { type: op.type,
                                    longtermId: op.longtermId });
          op.lifecycle = 'moot';
          op.localStatus = 'unknown';
          op.serverStatus = 'moot';
          removeFromServerQueue = true;
          completeOp = true;
          break;
      }

      // Do not save if this was an error.
      accountSaveSuggested = false;
    }
    else {
      switch (op.localStatus) {
        case 'doing':
          op.localStatus = 'done';
          // We have introduced the ability for a local op to decide that it
          // no longer wants a server operation to happen.  It accomplishes this
          // by marking the serverStatus as skip, which we then process and
          // convert to 'n/a'.  This is intended to be done by the local job
          // right before returning so the value doesn't get surfaced elsewhere.
          // Some might ask why this isn't some type of explicit return value.
          // To those people I say, "Good point, shut up."  I might then go on
          // to say that the v3 refactor will likely deal with this and that's
          // real soon.
          if (op.serverStatus === 'skip') {
            removeFromServerQueue = true;
            op.serverStatus = 'n/a';
            accountSaveSuggested = true; // this op change needs a save!
          }
          if (op.serverStatus === 'n/a') {
            op.lifecycle = 'done';
            completeOp = true;
          }
          break;
        case 'undoing':
          op.localStatus = 'undone';
          if (op.serverStatus === 'skip') {
            removeFromServerQueue = true;
            op.serverStatus = 'n/a';
            accountSaveSuggested = true; // this op change needs a save!
          }
          if (op.serverStatus === 'n/a') {
            op.lifecycle = 'undone';
            completeOp = true;
          }
          break;
      }
    }

    if (removeFromServerQueue) {
      var idx = serverQueue.indexOf(op);
      if (idx !== -1)
        serverQueue.splice(idx, 1);
    }
    localQueue.shift();

    console.log('runOp_end(' + wasMode + ': ' +
                JSON.stringify(op).substring(0, 160) + ')\n');
    logic(account, 'runOp_end',
          { mode: wasMode,
            type: op.type,
            error: err,
            op: op });

    // Complete the asynchronous log event pertaining to 'runOp'.
    if (op._logicAsyncEvent) {
      if (err) {
        op._logicAsyncEvent.reject(err);
      } else {
        op._logicAsyncEvent.resolve();
      }
    }

    var callback;
    if (completeOp) {
      if (this._opCallbacks.hasOwnProperty(op.longtermId)) {
        callback = this._opCallbacks[op.longtermId];
        delete this._opCallbacks[op.longtermId];
      }
    }

    if (accountSaveSuggested) {
      account.saveAccountState(
        null,
        this._startNextOp.bind(this, account, callback, op, err, resultIfAny),
        'localOp:' + op.type);
      return;
    }

    this._startNextOp(account, callback, op, err, resultIfAny);
  },

  /**
   * A server op finished; figure out what the error means, perform any
   * requested saves, and *only after the saves complete*, issue any appropriate
   * callback and only then start the next op.
   *
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

    var scope = logic.subscope(this, { type: op.type,
                                       longtermId: op.longtermId });

    if (serverQueue[0] !== op)
      logic(scope, 'opInvariantFailure');

    // Should we attempt to retry (but fail if tryCount is reached)?
    var maybeRetry = false;
    // Pop the event off the queue? (avoid bugs versus multiple calls)
    var consumeOp = true;
    // Generate completion notifications for the op?
    var completeOp = true;
    var wasMode = op.serverStatus.slice(0, -3);
    if (err) {
      switch (err) {
        case 'defer':
          if (++op.tryCount < $syncbase.MAX_OP_TRY_COUNT) {
            // Defer the operation if we still want to do the thing, but skip
            // deferring if we are now trying to undo the thing.
            if (op.serverStatus === 'doing' && op.lifecycle === 'do') {
              logic(scope, 'opDeferred');
              this._deferOp(account, op);
            }
            // remove the op from the queue, but don't mark it completed
            completeOp = false;
          }
          else {
            op.lifecycle = 'moot';
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
          logic(scope, 'opGaveUp');
          // we complete the op, but the error flag is propagated
          op.lifecycle = 'moot';
          op.serverStatus = 'moot';
          break;
        case 'moot':
          logic(scope, 'opMooted');
          // we complete the op, but the error flag is propagated
          op.lifecycle = 'moot';
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
              op.lifecycle = 'moot';
              op.serverStatus = 'moot';
              break;
            // this is the same thing as defer.
            case 'bailed':
              logic(scope, 'opDeferred');
              this._deferOp(account, op);
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
        logic(scope, 'opTryLimitReached');
        // we complete the op, but the error flag is propagated
        op.lifecycle = 'moot';
        op.serverStatus = 'moot';
      }
    }

    if (consumeOp)
      serverQueue.shift();

    console.log('runOp_end(' + wasMode + ': ' +
                JSON.stringify(op).substring(0, 160) + ')\n');
    logic(account, 'runOp_end', { mode: wasMode,
                                  type: op.type,
                                  error: err,
                                  op: op });

    // Complete the asynchronous log event pertaining to 'runOp'.
    if (op._logicAsyncEvent) {
      if (err) {
        op._logicAsyncEvent.reject(err);
      } else {
        op._logicAsyncEvent.resolve();
      }
    }

    // Some completeOp callbacks want to wait for account
    // save but they are triggered before save is attempted,
    // for the account to properly trigger runAfterSaves
    // callbacks, so set a flag indicating save state here.
    if (accountSaveSuggested)
      account._saveAccountIsImminent = true;

    var callback;
    if (completeOp) {
      if (this._opCallbacks.hasOwnProperty(op.longtermId)) {
        callback = this._opCallbacks[op.longtermId];
        delete this._opCallbacks[op.longtermId];
      }

      // This is a suggestion; in the event of high-throughput on operations,
      // we probably don't want to save the account every tick, etc.
      if (accountSaveSuggested) {
        account._saveAccountIsImminent = false;
        account.saveAccountState(
          null,
          this._startNextOp.bind(this, account, callback, op, err, resultIfAny),
          'serverOp:' + op.type);
        return;
      }
    }

    this._startNextOp(account, callback, op, err, resultIfAny);
  },

  /**
   * Shared code for _localOpCompleted and _serverOpCompleted to figure out what
   * to do next *after* any account save has completed, including invoking
   * callbacks.  See bug https://bugzil.la/1039007 for rationale as to why we
   * think it makes sense to defer the callbacks or to provide new reasons why
   * we should change this behaviour.
   *
   * It used to be that we would trigger saves without waiting for them to
   * complete with the theory that this would allow us to generally be more
   * efficient without losing correctness since the IndexedDB transaction model
   * is strong and takes care of data dependency issues for us.  However, for
   * both testing purposes and with some new concerns over correctness issues,
   * it's now making sense to wait on the transaction to commit.  There are
   * potentially some memory-use wins from waiting for the transaction to
   * complete, especially if we imagine some particularly pathological
   * situations.
   *
   * @param account
   * @param {Function} [callback]
   *   The callback associated with the last operation.  May be omitted.  If
   *    provided then all of the following arguments must also be provided.
   * @param [lastOp]
   * @param [err]
   * @param [result]
   */
  _startNextOp: function(account, callback, lastOp, err, result) {
    var queues = this._opsByAccount[account.id],
        serverQueue = queues.server,
        localQueue = queues.local;
    var op;

    if (callback) {
      try {
        callback(err, result, account, lastOp);
      }
      catch(ex) {
        console.log(ex.message, ex.stack);
        logic(this, 'opCallbackErr', { type: lastOp.type });
      }
    }

    // We must hold off on freeing up queue.active until after we have
    // completed processing and called the callback, just as we do in
    // _localOpCompleted. This allows `callback` to safely schedule
    // new jobs without interfering with the scheduling we're going to
    // do immediately below.
    queues.active = false;

    if (localQueue.length) {
      op = localQueue[0];
      this._dispatchLocalOpForAccount(account, op);
    }
    else if (serverQueue.length && this.online && account.enabled) {
      op = serverQueue[0];
      this._dispatchServerOpForAccount(account, op);
    }
    // We finished all the operations!  Woo!
    else {
      // Notify listeners
      if (this._opCompletionListenersByAccount[account.id]) {
        this._opCompletionListenersByAccount[account.id](account);
        this._opCompletionListenersByAccount[account.id] = null;
      }
      logic(this, 'allOpsCompleted', { accountId: account.id });


      // - Tell the account so it can clean-up its connections, etc.
      // (We do this after notifying listeners for the connection cleanup case
      // so that if the listener wants to schedule new activity, it can do so
      // without having to wastefully establish a new connection.)
      account.allOperationsCompleted();
    }
  },

  /**
   * Enqueue an operation for processing.  The local mutation is enqueued if it
   * has not yet been run.  The server piece is always enqueued.
   *
   * @args[
   *   @param[account]
   *   @param[op SerializedMutation]{
   *     Note that a `null` longtermId should be passed in if the operation
   *     should be persisted, and a 'session' string if the operation should
   *     not be persisted.  In both cases, a longtermId will be allocated,
   *   }
   *   @param[optionalCallback #:optional Function]{
   *     A callback to invoke when the operation completes.  Callbacks are
   *     obviously not capable of being persisted and are merely best effort.
   *   }
   * ]
   */
  _queueAccountOp: function(account, op, optionalCallback) {
    var queues = this._opsByAccount[account.id];
    // Log the op for debugging assistance
    // TODO: Create a real logger event; this will require updating existing
    // tests and so is not sufficiently trivial to do at this time.
    console.log('queueOp', account.id, op.type, 'pre-queues:',
                'local:', queues.local.length, 'server:', queues.server.length);
    // - Name the op, register callbacks
    if (op.longtermId === null) {
      // mutation job must be persisted until completed otherwise bad thing
      // will happen.
      op.longtermId = account.id + '/' +
                        $a64.encodeInt(account.meta.nextMutationNum++);
      account.mutations.push(op);
      // Clear out any completed/dead operations that put us over the undo
      // threshold.
      while (account.mutations.length > MAX_MUTATIONS_FOR_UNDO &&
             (account.mutations[0].lifecycle === 'done') ||
             (account.mutations[0].lifecycle === 'undone') ||
             (account.mutations[0].lifecycle === 'moot')) {
        account.mutations.shift();
      }
    }
    else if (op.longtermId === 'session') {
      op.longtermId = account.id + '/' +
                        $a64.encodeInt(account.meta.nextMutationNum++);
    }

    if (optionalCallback)
      this._opCallbacks[op.longtermId] = optionalCallback;



    // - Enqueue
    // Local processing needs to happen if we're not in the right local state.
    if (!this._testModeDisablingLocalOps &&
        ((op.lifecycle === 'do' && op.localStatus === null) ||
         (op.lifecycle === 'undo' && op.localStatus !== 'undone' &&
          op.localStatus !== 'unknown')))
      queues.local.push(op);
    if (op.serverStatus !== 'n/a' && op.serverStatus !== 'moot')
      queues.server.push(op);

    // If there is already something active, don't do anything!
    if (queues.active) {
    }
    else if (queues.local.length) {
      // Only actually dispatch if there is only the op we just (maybe).
      if (queues.local.length === 1 && queues.local[0] === op)
        this._dispatchLocalOpForAccount(account, op);
      // else: we grabbed control flow to avoid the server queue running
    }
    else if (queues.server.length === 1 && queues.server[0] === op &&
             this.online && account.enabled) {
      this._dispatchServerOpForAccount(account, op);
    }

    return op.longtermId;
  },

  waitForAccountOps: function(account, callback) {
    var queues = this._opsByAccount[account.id];
    if (!queues.active &&
        queues.local.length === 0 &&
        (queues.server.length === 0 || !this.online || !account.enabled))
      callback();
    else
      this._opCompletionListenersByAccount[account.id] = callback;
  },

  syncFolderList: function(account, callback) {
    this._queueAccountOp(
      account,
      {
        type: 'syncFolderList',
        longtermId: 'session',
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
        longtermId: 'session',
        lifecycle: 'do',
        localStatus: null,
        serverStatus: 'n/a',
        tryCount: 0,
        humanOp: 'purgeExcessMessages',
        folderId: folderId
      },
      callback);
  },

  /**
   * Download entire bodyRep(s) representation.
   */
  downloadMessageBodyReps: function(suid, date, callback) {
    var account = this.getAccountForMessageSuid(suid);
    this._queueAccountOp(
      account,
      {
        type: 'downloadBodyReps',
        longtermId: 'session',
        lifecycle: 'do',
        localStatus: 'done',
        serverStatus: null,
        tryCount: 0,
        humanOp: 'downloadBodyReps',
        messageSuid: suid,
        messageDate: date
      },
      callback
    );
  },

  downloadBodies: function(messages, options, callback) {
    if (typeof(options) === 'function') {
      callback = options;
      options = null;
    }

    var self = this;
    var pending = 0;

    function next() {
      if (!--pending) {
        callback();
      }
    }
    this._partitionMessagesByAccount(messages, null).forEach(function(x) {
      pending++;
      self._queueAccountOp(
        x.account,
        {
          type: 'downloadBodies',
          longtermId: 'session', // don't persist this job.
          lifecycle: 'do',
          localStatus: 'done',
          serverStatus: null,
          tryCount: 0,
          humanOp: 'downloadBodies',
          messages: x.messages,
          options: options
        },
        next
      );
    });
  },

  /**
   * Download one or more related-part or attachments from a message.
   * Attachments are named by their index because the indices are stable and
   * flinging around non-authoritative copies of the structures might lead to
   * some (minor) confusion.
   *
   * This request is persistent although the callback will obviously be
   * discarded in the event the app is killed.
   *
   * @param {String[]} relPartIndices
   *     The part identifiers of any related parts to be saved to IndexedDB.
   * @param {String[]} attachmentIndices
   *     The part identifiers of any attachment parts to be saved to
   *     DeviceStorage.  For each entry in this array there should be a
   *     corresponding boolean in registerWithDownloadManager.
   * @param {Boolean[]} registerAttachments
   *     An array of booleans corresponding to each entry in attachmentIndices
   *     indicating whether the download should be registered with the download
   *     manager.
   */
  downloadMessageAttachments: function(messageSuid, messageDate,
                                       relPartIndices, attachmentIndices,
                                       registerAttachments,
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
        attachmentIndices: attachmentIndices,
        registerAttachments: registerAttachments
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

  moveMessages: function(messageSuids, targetFolderId, callback) {
    var self = this, longtermIds = [],
        targetFolderAccount = this.getAccountForFolderId(targetFolderId);
    var latch = $allback.latch();
    this._partitionMessagesByAccount(messageSuids, null).forEach(function(x,i) {
      // TODO: implement cross-account moves and then remove this constraint
      // and instead schedule the cross-account move.
      if (x.account !== targetFolderAccount)
        throw new Error('cross-account moves not currently supported!');

      // If the move is entirely local-only (i.e. folders that will
      // never be synced to the server), we don't need to run the
      // server side of the job.
      //
      // When we're moving a message between an outbox and
      // localdrafts, we need the operation to succeed even if we're
      // offline, and we also need to receive the "moveMap" returned
      // by the local side of the operation, so that the client can
      // call "editAsDraft" on the moved message.
      //
      // TODO: When we have server-side 'draft' folder support, we
      // actually still want to run the server side of the operation,
      // but we won't want to wait for it to complete. Maybe modify
      // the job system to pass back localResult and serverResult
      // independently, or restructure the way we move outbox messages
      // back to the drafts folder.
      var targetStorage =
            targetFolderAccount.getFolderStorageForFolderId(targetFolderId);

      // If any of the sourceStorages (or targetStorage) is not
      // local-only, we can stop looking.
      var isLocalOnly = targetStorage.isLocalOnly;
      for (var j = 0; j < x.messages.length && isLocalOnly; j++) {
        var sourceStorage =
              self.getFolderStorageForMessageSuid(x.messages[j].suid);
        if (!sourceStorage.isLocalOnly) {
          isLocalOnly = false;
        }
      }

      var longtermId = self._queueAccountOp(
        x.account,
        {
          type: 'move',
          longtermId: null,
          lifecycle: 'do',
          localStatus: null,
          serverStatus: isLocalOnly ? 'n/a' : null,
          tryCount: 0,
          humanOp: 'move',
          messages: x.messages,
          targetFolder: targetFolderId,
        }, latch.defer(i));
      longtermIds.push(longtermId);
    });

    // When the moves finish, they'll each pass back results of the
    // form [err, moveMap]. The moveMaps provide a mapping of
    // sourceSuid => targetSuid, allowing the client to point itself
    // to the moved messages. Since multiple moves would result in
    // multiple moveMap results, we combine them here into a single
    // result map.
    latch.then(function(results) {
      // results === [[err, moveMap], [err, moveMap], ...]
      var combinedMoveMap = {};
      for (var key in results) {
        var moveMap = results[key][1];
        for (var k in moveMap) {
          combinedMoveMap[k] = moveMap[k];
        }
      }
      callback && callback(/* err = */ null, /* result = */ combinedMoveMap);
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

  /**
   * APPEND messages to an IMAP server without locally saving the messages.
   * This was originally an IMAP testing operation that was co-opted to be
   * used for saving sent messages in a corner-cutting fashion.  (The right
   * thing for us to do would be to save the message locally too and deal with
   * the UID implications.  But that is tricky.)
   *
   * See ImapAccount.saveSentMessage for more context.
   *
   * POP3's variation on this is saveSentDraft
   */
  appendMessages: function(folderId, messages, callback) {
    var account = this.getAccountForFolderId(folderId);
    var longtermId = this._queueAccountOp(
      account,
      {
        type: 'append',
        // Don't persist.  See ImapAccount.saveSentMessage for our rationale.
        longtermId: 'session',
        lifecycle: 'do',
        localStatus: 'done',
        serverStatus: null,
        tryCount: 0,
        humanOp: 'append',
        messages: messages,
        folderId: folderId,
      },
      callback);
    return [longtermId];
  },

  /**
   * Save a sent POP3 message to the account's "sent" folder.  See
   * Pop3Account.saveSentMessage for more information.
   *
   * IMAP's variation on this is appendMessages.
   *
   * @param folderId {FolderID}
   * @param sentSafeHeader {HeaderInfo}
   *   The header ready to be added to the sent folder; suid issued and
   *   everything.
   * @param sentSafeBody {BodyInfo}
   *   The body ready to be added to the sent folder; attachment blobs stripped.
   * @param callback {function(err)}
   */
  saveSentDraft: function(folderId, sentSafeHeader, sentSafeBody, callback) {
    var account = this.getAccountForMessageSuid(sentSafeHeader.suid);
    var longtermId = this._queueAccountOp(
      account,
      {
        type: 'saveSentDraft',
        // we can persist this since we have stripped the blobs
        longtermId: null,
        lifecycle: 'do',
        localStatus: null,
        serverStatus: 'n/a',
        tryCount: 0,
        humanOp: 'saveSentDraft',
        folderId: folderId,
        headerInfo: sentSafeHeader,
        bodyInfo: sentSafeBody
      },
      callback);
    return [longtermId];
  },

  /**
   * Process the given attachment blob in slices into base64-encoded Blobs
   * that we store in IndexedDB (currently).  This is a local-only operation.
   *
   * This function is implemented as a job/operation so it is inherently ordered
   * relative to other draft-related calls.  But do keep in mind that you need
   * to make sure to not destroy the underlying storage for the Blob (ex: when
   * using DeviceStorage) until the callback has fired.
   */
  attachBlobToDraft: function(account, existingNamer, attachmentDef, callback) {
    this._queueAccountOp(
      account,
      {
        type: 'attachBlobToDraft',
        // We don't persist the operation to disk in order to avoid having the
        // Blob we are attaching get persisted to IndexedDB.  Better for the
        // disk I/O to be ours from the base64 encoded writes we do even if
        // there is a few seconds of data-loss-ish vulnerability.
        longtermId: 'session',
        lifecycle: 'do',
        localStatus: null,
        serverStatus: 'n/a', // local-only currently
        tryCount: 0,
        humanOp: 'attachBlobToDraft',
        existingNamer: existingNamer,
        attachmentDef: attachmentDef
      },
      callback
    );
  },

  /**
   * Remove an attachment from a draft.  This will not interrupt an active
   * attaching operation or moot a pending one.  This is a local-only operation.
   */
  detachAttachmentFromDraft: function(account, existingNamer, attachmentIndex,
                                      callback) {
    this._queueAccountOp(
      account,
      {
        type: 'detachAttachmentFromDraft',
        // This is currently non-persisted for symmetry with attachBlobToDraft
        // but could be persisted if we wanted.
        longtermId: 'session',
        lifecycle: 'do',
        localStatus: null,
        serverStatus: 'n/a', // local-only currently
        tryCount: 0,
        humanOp: 'detachAttachmentFromDraft',
        existingNamer: existingNamer,
        attachmentIndex: attachmentIndex
      },
      callback
    );
  },

  /**
   * Save a new (local) draft or update an existing (local) draft.  A new namer
   * is synchronously created and returned which will be the name for the draft
   * assuming the save completes successfully.
   *
   * This function is implemented as a job/operation so it is inherently ordered
   * relative to other draft-related calls.
   *
   * @method saveDraft
   * @param account
   * @param [existingNamer] {MessageNamer}
   * @param draftRep
   * @param callback {Function}
   * @return {MessageNamer}
   *
   */
  saveDraft: function(account, existingNamer, draftRep, callback) {
    var draftsFolderMeta = account.getFirstFolderWithType('localdrafts');
    var draftsFolderStorage = account.getFolderStorageForFolderId(
                                draftsFolderMeta.id);
    var newId = draftsFolderStorage._issueNewHeaderId();
    var newDraftInfo = {
      id: newId,
      suid: draftsFolderStorage.folderId + '/' + newId,
      // There are really 3 possible values we could use for this; when the
      // front-end initiates the draft saving, when we, the back-end observe and
      // enqueue the request (now), or when the draft actually gets saved to
      // disk.
      //
      // This value does get surfaced to the user, so we ideally want it to
      // occur within a few seconds of when the save is initiated.  We do this
      // here right now because we have access to $date, and we should generally
      // be timely about receiving messages.
      date: $date.NOW(),
    };
    this._queueAccountOp(
      account,
      {
        type: 'saveDraft',
        longtermId: null,
        lifecycle: 'do',
        localStatus: null,
        serverStatus: 'n/a', // local-only currently
        tryCount: 0,
        humanOp: 'saveDraft',
        existingNamer: existingNamer,
        newDraftInfo: newDraftInfo,
        draftRep: draftRep,
      },
      callback
    );
    return {
      suid: newDraftInfo.suid,
      date: newDraftInfo.date
    };
  },

  /**
   * Kick off a job to send pending outgoing messages. See the job
   * documentation regarding "sendOutboxMessages" for more details.
   *
   * @param {MailAccount} account
   * @param {MessageNamer} opts.beforeMessage
   *   If provided, start with the first message older than this one.
   *   (This is only used internally within the job itself.)
   * @param {string} opts.reason
   *   Optional description, used for debugging.
   * @param {Boolean} opts.emitNotifications
   *   True to pass along send status notifications to the model.
   */
  sendOutboxMessages: function(account, opts, callback) {
    opts = opts || {};

    console.log('outbox: sendOutboxMessages(', JSON.stringify(opts), ')');

    // If we are not online, we won't actually kick off a job until we
    // come back online. Immediately fire a status notification
    // indicating that we are done attempting to sync for now.
    if (!this.online) {
      this.notifyOutboxSyncDone(account);
      // Fall through; we still want to queue the op.
    }

    // Do not attempt to check if the outbox is empty here. This op is
    // queued immediately after the client moves a message to the
    // outbox. The outbox may be empty here, but it might be filled
    // when the op runs.
    this._queueAccountOp(
      account,
      {
        type: 'sendOutboxMessages',
        longtermId: 'session', // Does not need to be persisted.
        lifecycle: 'do',
        localStatus: 'n/a',
        serverStatus: null,
        tryCount: 0,
        beforeMessage: opts.beforeMessage,
        emitNotifications: opts.emitNotifications,
        humanOp: 'sendOutboxMessages'
      },
      callback);
  },

  /**
   * Dispatch a notification to the frontend, indicating that we're
   * done trying to send messages from the outbox for now.
   */
  notifyOutboxSyncDone: function(account) {
    this.__notifyBackgroundSendStatus({
      accountId: account.id,
      state: 'syncDone'
    });
  },

  /**
   * Enable or disable Outbox syncing temporarily. For instance, you
   * will want to disable outbox syncing if the user is in "edit mode"
   * for the list of messages in the outbox folder. This setting does
   * not persist.
   */
  setOutboxSyncEnabled: function(account, enabled, callback) {
    this._queueAccountOp(
      account,
      {
        type: 'setOutboxSyncEnabled',
        longtermId: 'session', // Does not need to be persisted.
        lifecycle: 'do',
        localStatus: null,
        serverStatus: 'n/a', // Local-only.
        outboxSyncEnabled: enabled,
        tryCount: 0,
        humanOp: 'setOutboxSyncEnabled'
      },
      callback);
  },

  /**
   * Delete an existing (local) draft.
   *
   * This function is implemented as a job/operation so it is inherently ordered
   * relative to other draft-related calls.
   */
  deleteDraft: function(account, messageNamer, callback) {
    this._queueAccountOp(
      account,
      {
        type: 'deleteDraft',
        longtermId: null,
        lifecycle: 'do',
        localStatus: null,
        serverStatus: 'n/a', // local-only currently
        tryCount: 0,
        humanOp: 'deleteDraft',
        messageNamer: messageNamer
      },
      callback
    );

  },

  /**
   * Create a folder that is the child/descendant of the given parent folder.
   * If no parent folder id is provided, we attempt to create a root folder,
   * but honoring the server's configured personal namespace if applicable.
   *
   * @param [AccountId] accountId
   * @param {String} [parentFolderId]
   *   If null, place the folder at the top-level, otherwise place it under
   *   the given folder.
   * @param {String} folderName
   *   The (unencoded) name of the folder to be created.
   * @param {String} folderType
   *   The gelam folder type we should think of this folder as.  On servers
   *   supporting SPECIAL-USE we will attempt to set the metadata server-side
   *   as well.
   * @param {Boolean} containOtherFolders
   *   Should this folder only contain other folders (and no messages)?
   *   On some servers/backends, mail-bearing folders may not be able to
   *   create sub-folders, in which case one would have to pass this.
   * @param {Function(err, folderMeta)} callback
   *   A callback that gets called with the folderMeta of the successfully
   *   created folder or null if there was an error.  (The error code is also
   *   provided as the first argument.)
   * ]
   */
  createFolder: function(accountId, parentFolderId, folderName, folderType,
                         containOtherFolders, callback) {
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
        folderType: folderType,
        containOtherFolders: containOtherFolders
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

  /**
   * Trigger the necessary folder upgrade logic
   */
  performFolderUpgrade: function(folderId, callback) {
    var account = this.getAccountForFolderId(folderId);
    this._queueAccountOp(
      account,
      {
        type: 'upgradeDB',
        longtermId: 'session',
        lifecycle: 'do',
        localStatus: null,
        serverStatus: 'n/a',
        tryCount: 0,
        humanOp: 'append',
        folderId: folderId
      },
      callback
    );
  }

  //////////////////////////////////////////////////////////////////////////////
};

}); // end define
