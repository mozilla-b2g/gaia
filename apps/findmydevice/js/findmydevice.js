/* global SettingsHelper */
/* global LockedSettingsHelper */
/* global asyncStorage */
/* global Requester */
/* global Commands */
/* global Config */
/* global DUMP */
/* global IAC_API_WAKEUP_REASON_ENABLED_CHANGED */
/* global IAC_API_WAKEUP_REASON_LOGIN */
/* global IAC_API_WAKEUP_REASON_LOGOUT */
/* global IAC_API_WAKEUP_REASON_STALE_REGISTRATION */
/* global IAC_API_WAKEUP_REASON_TRY_DISABLE */
/* global IAC_API_WAKEUP_REASON_LOCKSCREEN_CLOSED */

'use strict';

// XXX(ggp) Because FMD is a background app with no UI, it is very likely to be
// killed by the low memory killer on low memory devices. To counter that, we
// grab a wakelock every time we're doing async operations such as writing to a
// setting or accessing the network (in my experience, we don't get killed while
// actually running JS code). Async commands also need wakelocks, but they're
// managed separately in commands.js

// Like SettingsHelper, but ensures a wakelock is held while the setting is
// retrieved or being set. set() returns a promise that resolves when the
// observer is next called. get() returns a promise that resolves with the
// value of the setting.
function LockedSettingsHelper(setting, lock, unlock) {
  var helper = SettingsHelper(setting);
  var resolver = null;

  return {
    set: function(value) {
      lock();
      helper.set(value);
      return new Promise((res, rej) => resolver = res);
    },

    get: function() {
      lock();
      return new Promise((resolve, reject) => {
        helper.get(value => {
          resolve(value);
          setTimeout(unlock);
        });
      });
    },

    addObserver: function(observer) {
      var unlockObserver = function(event) {
        var ret;
        observer && (ret = observer(event));
        if (resolver !== null) {
          resolver(ret);
          resolver = null;
          setTimeout(unlock);
        }
      };
      navigator.mozSettings.addObserver(setting, unlockObserver);
    }
  };
}

var FindMyDevice = {
  _state: null,

  _registering: false,

  _reply: {},

  _registered: false,

  _registeredHelper: null,

  _enabled: false,

  _enabledHelper: null,

  _retryCount: 0,

  _retryCountHelper: null,

  _loggedIn: false,

  _loginResolver: null,

  _loginRejector: null,

  _currentClientID: '',

  _currentClientIDHelper: null,

  _canDisable: false,

  _canDisableHelper: null,

  _disableAttempt: false,

  _highPriorityWakeLocks: {
    clientLogic: [],
    command: []
  },

  _fxaReady: false,

  init: function fmd_init() {
    var self = this;

    navigator.mozId.watch({
      wantIssuer: 'firefox-accounts',
      audience: Config.api_url,
      onready: self._onReady.bind(self),
      onlogin: self._onLogin.bind(self),
      onlogout: self._onLogout.bind(self),
      onerror: self._onFxAError.bind(self)
    });
  },

  _observeSettings: function fmd_observe_settings() {
    this._registeredHelper.addObserver(this._onRegisteredChanged.bind(this));
    this._enabledHelper.addObserver(this._onEnabledChanged.bind(this));
    this._currentClientIDHelper.addObserver(this._onClientIDChanged.bind(this));
    this._retryCountHelper.addObserver(this._onRetryCountChanged.bind(this));

    // We only allow disabling Find My Device if the same person
    // who first enabled it is logged in to FxA, and in that case
    // 'findmydevice.can-disable' is true.
    // However, note that FMD doesn't store the user's email address,
    // but rather a client ID that is derived from the FxA assertion
    // and stored in this._state.clientid.
    this._canDisableHelper.addObserver(this._onCanDisableChanged.bind(this));
  },

  _onReady: function fmd_fxa_onready() {
    this._loadState(() => {
      this._initSettings(() => {
        this._observeSettings();
        this._initMessageHandlers();
      });
    });

    this._fxaReady = true;
  },

  _loadState: function fmd_load_state(callback) {
    var self = this;
    asyncStorage.getItem('findmydevice-state', function(state) {
      self._state = state;
      if (state) {
        Requester.setHawkCredentials(state.deviceid, state.secret);
      }

      callback && callback();
    });
  },

  _initSettings: function fmd_init_settings(callback) {
    // for each setting we're interested in, create a LockedSettingsHelper,
    // cache its initial value in a property (e.g., _enabled), and store the
    // LockedSettingsHelper as another property (e.g., _enabledHelper).
    var settingsToProperties = {
      // setting name : property name for cached value
      'findmydevice.enabled': '_enabled',
      'findmydevice.registered': '_registered',
      'findmydevice.current-clientid': '_currentClientID',
      'findmydevice.can-disable': '_canDisable',
      'findmydevice.retry-count': '_retryCount'
    };
    var settings = Object.keys(settingsToProperties);

    return Promise.all(settings.map((s, i) => {
      var prop = settingsToProperties[s];
      var helper = this[prop + 'Helper'] = this._makeLockedSettingsHelper(s);
      return helper.get().then(value => {
        this[prop] = value;
      });
    })).then(callback);
  },

  _makeLockedSettingsHelper: function fmd_make_locked_settings_helper(setting) {
    var lock = this.beginHighPriority.bind(this, 'clientLogic'),
        unlock = this.endHighPriority.bind(this, 'clientLogic');
    return LockedSettingsHelper(setting, lock, unlock);
  },

  _initMessageHandlers: function fmd_init_message_handlers() {
    navigator.mozSetMessageHandler('push', (function(message) {
      DUMP('findmydevice got push notification!');
      this._contactServer();
    }).bind(this));

    navigator.mozSetMessageHandler('push-register', (function(message) {
      DUMP('findmydevice lost push endpoint, re-registering');
      this._registeredHelper.set(false);
    }).bind(this));

    navigator.mozSetMessageHandler('alarm', (function(alarm) {
      DUMP('findmydevice alarm!');
      this._contactServer();
      this._refreshClientIDIfRegistered(false);
    }).bind(this));

    navigator.mozSetMessageHandler('connection', (function(request) {
      var port = request.port;
      port.onmessage = (function(event) {
        if (request.keyword === 'findmydevice-wakeup') {
          DUMP('got wake up request');

          var reason = event.data;
          if (reason === IAC_API_WAKEUP_REASON_ENABLED_CHANGED) {
            DUMP('enabled state changed, trying to reach the server');
            // Ensure the retry counter is reset to 0 on enable
            this._retryCountHelper.set(0);
            this._contactServer();
          } else if (reason === IAC_API_WAKEUP_REASON_STALE_REGISTRATION) {
            DUMP('stale registration, re-registering');
            this._registeredHelper.set(false);
          } else if (reason === IAC_API_WAKEUP_REASON_LOGIN) {
            DUMP('new login, invalidating client id');
            this._loggedIn = true;
            this._currentClientIDHelper.set('');
          } else if (reason === IAC_API_WAKEUP_REASON_LOGOUT) {
            DUMP('logout, invalidating client id');
            this._loggedIn = false;
            this._currentClientIDHelper.set('');
          } else if (reason === IAC_API_WAKEUP_REASON_TRY_DISABLE) {
            DUMP('refreshing client id and attempting to disable');
            this._disableAttempt = true;
            this._refreshClientIDIfRegistered(true);
          } else if (reason === IAC_API_WAKEUP_REASON_LOCKSCREEN_CLOSED) {
            DUMP('unlocked');
            this._onLockscreenClosed();
          }

          return;
        }

        if (request.keyword === 'findmydevice-test') {
            DUMP('got request for test command!');
            this._processCommands(event.data, true);
        }
      }).bind(this);
    }).bind(this));
  },

  _contactServer: function fmd_contact_server() {
    var p;
    this.beginHighPriority('clientLogic');
    if (this._registered && this._enabled) {
      p = this._replyAndFetchCommands();
    } else if (this._registered && !this._enabled) {
      p = this._reportDisabled();
    } else if (!this._registered && this._enabled) {
      p = this._register();
    } else {
      // XXX(ggp) this should never happen, but let's play
      // it safe and release lock we acquired
      DUMP('can\'t contact the server while not registered and not enabled!!');
      p = Promise.reject();
    }

    p.then(
      this.endHighPriority.bind(this, 'clientLogic'),
      this.endHighPriority.bind(this, 'clientLogic'));
  },

  _reportDisabled: function fmd_report_disabled() {
    DUMP('reporting disabled');
    return Requester.promisePost(
      this._getCommandEndpoint(),
      {enabled: false}).then(
      this._handleServerResponse.bind(this),
      this._handleServerError.bind(this));
  },

  _register: function fmd_register() {
    DUMP('findmydevice attempting registration.');
    DUMP('registering: ' + this._registering);

    if (this._registering) {
      this._registering = false;
      return Promise.resolve();
    }

    this._registering = true;

    var assertionPromise;
    if (this._state === null) {
      // We are not registered yet, so we need to give the server a FxA
      // assertion.

      if (!this._loggedIn) {
        // Can't request() while not logged in, as that would bring up the
        // FxA dialog. Attempting a first registration while logged out is
        // theoretically possible (if, for example, a first registration
        // failed, and this is an alarm-driven re-attempt, and the user logged
        // out while we slept before this attempt), but it's a very unlikely
        // corner case. For now, just give up if this happens, but we still
        // need to notify the user somehow (bug 1013423).
        this._registering = false;
        return Promise.resolve();
      }

      assertionPromise = this._requestAssertion();
    } else {
      // We don't need to send assertions on re-registrations, just rely on
      // our client ID and HAWK signature to authenticate us. This works even
      // if we're logged out of FxA, so use null for the assertion.
      assertionPromise = null;
    }

    var pushPromise = navigator.push.register();
    return Promise.all([assertionPromise, pushPromise]).then(values => {
      DUMP('got assertion and push endpoint, requesting registration');
      var assertion = values[0], endpoint = values[1];
      return this._requestRegistration(assertion, endpoint).then(response => {
        DUMP('findmydevice successfully registered: ', response);
        return new Promise((resolve, reject) => {
          this._registering = false;
          asyncStorage.setItem('findmydevice-state', response, () => {
            resolve(this._registeredHelper.set(true));
          });
        });
      }, err => {
        this._registering = false;
        return this._handleServerError(err);
      });
    }, () => {
      DUMP('failed to obtain assertion or push endpoint!');
      this._registering = false;
      return this._countRegistrationRetry();
    });
  },

  _requestRegistration: function fmd_request_registration(assertion, endpoint) {
    var obj = {
      pushurl: endpoint,
      accepts: Commands.getEnabledCommands()
    };

    if (assertion != null) {
      obj.assert = assertion;
    }

    if (this._state !== null) {
      obj.deviceid = this._state.deviceid;
    }

    return Requester.promisePost('/register/', obj);
  },

  _requestAssertion: function fmd_request_assertion() {
    return new Promise((resolve, reject) => {
      this._loginResolver = resolve;
      this._loginRejector = reject;

      navigator.mozId.request();
    });
  },

  _resolveAssertionRequest: function fmd_resolve_assertion(assertion) {
    if (this._loginResolver) {
      this._loginResolver(assertion);
      this._loginResolver = null;
      this._loginRejector = null;
    }
  },

  _rejectAssertionRequest: function fmd_reject_assertion_request() {
    if (this._loginRejector) {
      this._loginRejector();
      this._loginResolver = null;
      this._loginRejector = null;
    }
  },

  _onLogin: function fmd_on_login(assertion) {
    DUMP('logged in to FxA');

    // XXX(ggp) When initializing, we'll process FxA's automatic invocation
    // of onlogin/onlogout before any IAC message, so use these calls to
    // initialize _loggedIn. However, when FMD is already running, there's
    // no guaranteee that onlogin/onlogout will fire before the IAC handler,
    // so we have dedicated IAC messages (IAC_API_WAKEUP_REASON_LOGIN and
    // IAC_API_WAKEUP_REASON_LOGOUT) to cover login state changes, and we
    // use the handlers for these messages to update _loggedIn.
    this._loggedIn = true;
    this._resolveAssertionRequest(assertion);
  },

  _onLogout: function fmd_fxa_onlogout() {
    DUMP('logged out of FxA');
    this._loggedIn = false;
  },

  _onFxAError: function fmd_on_error(error) {
    DUMP('FxA error: ' + error);

    if (!this._fxaReady) {
      // FIXME(ggp) workaround for bug 1040935, if FxA errors out
      // while we are initializing (usually due to an unverified
      // account), just give up for now.
      window.close();
    }

    this._rejectAssertionRequest();
    this._scheduleAlarm('retry');
  },

  _cancelClientIDRefresh: function fmd_cancel_clientid_refresh() {
    this._disableAttempt = false;

    // If we've been woken up by the Settings app because of a disable
    // attempt, it expects us to change these two settings at the end
    // of the operation, so set them to their current values if we're
    // canceling to make sure the state in the Settings is updated
    // properly.
    return this._enabledHelper.set(this._enabled).then(() =>
      this._currentClientIDHelper.set(this._currentClientID));
  },

  _scheduleAlarm: function fmd_schedule_alarm(mode) {
    var nextAlarm = new Date();

    if (mode === 'ping') {
      // this is just a regular ping to the server to make
      // sure we're still registered, so use a long interval
      nextAlarm.setHours(nextAlarm.getHours() + 6);
    } else if (mode === 'retry') {
      // something went wrong when registering or talking to the
      // server, we should check back shortly
      var interval = 1 + Math.floor(5 * Math.random());
      nextAlarm.setMinutes(nextAlarm.getMinutes() + interval);
    } else {
      DUMP('invalid alarm mode!');
      return Promise.reject();
    }

    return navigator.mozAlarms.getAll().then((result) => {
      result.forEach(function(alarm) {
        navigator.mozAlarms.remove(alarm.id);
      });

      var data = {type: 'findmydevice-alarm'};
      return navigator.mozAlarms.add(nextAlarm, 'honorTimezone', data);
    });
  },

  _replyAndFetchCommands: function fmd_reply_and_fetch() {
    var reply = this._reply;
    reply.has_passcode = Commands.deviceHasPasscode();
    this._reply = {};
    return Requester.promisePost(
      this._getCommandEndpoint(), reply).then(
      this._handleServerResponse.bind(this),
      this._handleServerError.bind(this));
  },

  _onRegisteredChanged: function fmd_registered_changed(event) {
    this._registered = event.settingValue;
    DUMP('registered: ' + this._registered);

    if (!this._registered) {
      this._contactServer();
    } else {
      this._loadState((function() {
        this._contactServer();
        this._currentClientIDHelper.set('');
      }).bind(this));
    }
  },

  _onEnabledChanged: function fmd_enabled_changed(event) {
    // No need to contact the server here if we've been enabled,
    // since that means we'll get a wake up request from the System
    // app
    this._enabled = event.settingValue;
    DUMP('enabled: ' + this._enabled);
  },

  _onClientIDChanged: function fmd_client_id_changed(event) {
    this._currentClientID = event.settingValue;
    DUMP('current id set to: ', this._currentClientID);

    if (this._loggedIn && this._currentClientID === '') {
      return this._refreshClientIDIfRegistered(false);
    } else if (this._registered) {
      return this._canDisableHelper.set(
        this._loggedIn &&
        this._currentClientID === this._state.clientid);
    }
  },

  _onCanDisableChanged: function fmd_can_disable_changed(event) {
    if (event.settingValue === true && this._disableAttempt) {
      this._enabledHelper.set(false);
    }

    this._disableAttempt = false;
  },

  _onRetryCountChanged: function fmd_retry_count_changed(event) {
    this._retryCount = event.settingValue;
  },

  _refreshClientIDIfRegistered: function fmd_refresh_client_id(forceReauth) {
    DUMP('refreshing client id if registered and logged in: ',
      {registered: this._registered, loggedIn: this._loggedIn});

    if (!this._registered || !this._loggedIn) {
      return Promise.reject();
    }

    DUMP('requesting assertion to refresh client id, forceReauth: ' +
         forceReauth);

    this.beginHighPriority('clientLogic');
    var p = new Promise((resolve, reject) => {
      this._loginResolver = resolve;
      this._loginRejector = reject;

      var mozIdRequestOptions = {};
      if (forceReauth) {
        mozIdRequestOptions.refreshAuthentication = 0;
        mozIdRequestOptions.oncancel = reject;
      }

      navigator.mozId.request(mozIdRequestOptions);
    }).then(assertion => {
      return Requester.promisePost('/validate/', {assert: assertion}).then(
        this._onClientIDResponse.bind(this),
        this._onClientIDServerError.bind(this));
    }, () => this._cancelClientIDRefresh()).then(
      this.endHighPriority.bind(this, 'clientLogic'),
      this.endHighPriority.bind(this, 'clientLogic'));

    return p;
  },

  _onLockscreenClosed: function fmd_on_lockscreen_closed() {
    if (Commands.deviceHasPasscode()) {
      DUMP('cancelling ring and track');
      Commands.invokeCommand('ring', [0]);
      Commands.invokeCommand('track', [0]);
    }
  },

  _onClientIDResponse: function fmd_on_client_id(response) {
    DUMP('got clientid reponse: ', response);

    if (response.valid) {
      return this._currentClientIDHelper.set(response.uid);
    }

    DUMP('failed to verify assertion for client id!');
    return this._onClientIDServerError();
  },

  _onClientIDServerError: function fmd_on_client_id_error() {
    DUMP('failed to fetch or verify client id!');
    return this._scheduleAlarm('retry').then(() =>
      this._cancelClientIDRefresh());
  },

  _handleServerResponse: function(response, testing) {
    if (response && (this._enabled || testing)) {
      this._processCommands(response);
    }

    this._scheduleAlarm('ping');
  },

  _processCommands: function fmd_process_commands(cmdobj) {
    function noop() {} // callback for testing

    for (var cmd in cmdobj) {
      // map server (short) commands to methods in the
      // commands object, and parse the arguments.
      var argsObj = cmdobj[cmd], command, args;
      switch (cmd) {
        case 't':
          command = 'track';
          args = [parseInt(argsObj.d, 10)];
          break;
        case 'e':
          command = 'erase';
          args = [];
          break;
        case 'l':
          command = 'lock';
          args = [argsObj.m, argsObj.c];
          break;
        case 'r':
          command = 'ring';
          args = [parseInt(argsObj.d, 10)];
          break;
        default:
          this._replyCallback(cmd, false, 'command not available');
          return;
      }

      DUMP('command ' + cmd + ', args ' + JSON.stringify(args));

      // add the callback as the last argument
      if (cmdobj.testing !== true) {
        args.push(this._replyCallback.bind(this, cmd));
      } else {
        args.push(noop);
      }

      Commands.invokeCommand(command, args);
    }
  },

  _countRegistrationRetry: function fmd_count_registration_retry (){
    var ret = this._scheduleAlarm('retry');

    if (navigator.onLine && !this._registered) {
      ret = ret.then(() => {
        return this._retryCountHelper.set((this._retryCount || 0) + 1);
      });
    }

    return ret;
  },

  _handleServerError: function fmd_handle_server_error(err) {
    DUMP('findmydevice request failed with status: ' + err.status);
    if (err.status === 401 && this._registered) {
      return this._registeredHelper.set(false);
    } else {
      return this._countRegistrationRetry();
    }
  },

  _replyCallback: function fmd_reply(cmd, ok, retval) {
    var value = {ok: ok};

    if (cmd === 't' && ok === true && retval !== undefined) {
      value.la = retval.coords.latitude;
      value.lo = retval.coords.longitude;
      value.acc = retval.coords.accuracy;
      value.ti = retval.timestamp;
    } else if (ok === false) {
      value.error = retval;
    }

    this._reply[cmd] = value;
    this._contactServer();
  },

  _getCommandEndpoint: function fmd_get_command_endpoint() {
    return '/cmd/' + this._state.deviceid;
  },

  beginHighPriority: function(reason) {
    DUMP('begin high priority section, reason: ', reason);
    if (Object.keys(this._highPriorityWakeLocks).indexOf(reason) === -1) {
      DUMP('unknown reason for high priority section?!');
      return;
    }

    DUMP('acquiring one wakelock, wakelocks are: ',
      this._highPriorityWakeLocks);
    this._highPriorityWakeLocks[reason].push(
      navigator.requestWakeLock('high-priority'));
  },

  endHighPriority: function(reason) {
    DUMP('end high priority section, reason: ', reason);
    if (!this._highPriorityWakeLocks[reason]) {
      return;
    }

    DUMP('releasing one wakelock, wakelocks are: ',
      this._highPriorityWakeLocks);
    this._highPriorityWakeLocks[reason].pop().unlock();
  }
};

FindMyDevice.init();
