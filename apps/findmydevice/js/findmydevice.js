/* global SettingsHelper */
/* global asyncStorage */
/* global Requester */
/* global Commands */
/* global Config */
/* global DUMP */
/* global IAC_API_WAKEUP_REASON_ENABLED */
/* global IAC_API_WAKEUP_REASON_LOGIN */
/* global IAC_API_WAKEUP_REASON_LOGOUT */
/* global IAC_API_WAKEUP_REASON_STALE_REGISTRATION */
/* global IAC_API_WAKEUP_REASON_TRY_DISABLE */

'use strict';

var FindMyDevice = {
  _state: null,

  _registering: false,

  _refreshingClientID: false,

  _reply: {},

  _registered: false,

  _registeredHelper: null,

  _enabled: false,

  _enabledHelper: null,

  _loggedIn: false,

  _currentClientID: '',

  _currentClientIDHelper: null,

  _canDisable: false,

  _canDisableHelper: null,

  _disableAttempt: false,

  init: function fmd_init() {
    var self = this;

    navigator.mozId.watch({
      wantIssuer: 'firefox-accounts',
      audience: Config.audience_url,
      onready: self._onReady.bind(self),
      onlogin: self._onLogin.bind(self),
      onlogout: self._onLogout.bind(self),
      onerror: self._onFxAError.bind(self)
    });

    this._observeSettings();
  },

  _observeSettings: function fmd_observe_settings() {
    var settings = navigator.mozSettings;

    settings.addObserver('findmydevice.registered',
      this._onRegisteredChanged.bind(this));
    settings.addObserver('findmydevice.enabled',
      this._onEnabledChanged.bind(this));
    settings.addObserver('findmydevice.current-clientid',
      this._onClientIDChanged.bind(this));

    // We only allow disabling Find My Device if the same person
    // who first enabled it is logged in to FxA, and in that case
    // 'findmydevice.can-disable' is true.
    // However, note that FMD doesn't store the user's email address,
    // but rather a client ID that is derived from the FxA assertion
    // and stored in this._state.clientid.
    settings.addObserver('findmydevice.can-disable',
      this._onCanDisableChanged.bind(this));
  },

  _onReady: function fmd_fxa_onready() {
    var self = this;
    this._loadState(function() {
      self._initSettings(self._initMessageHandlers.bind(self));
    });
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
    // for each setting we're interested in, create a SettingsHelper,
    // cache its initial value in a property (e.g., _enabled), and
    // store the SettingsHelper as another property (e.g., _enabledHelper).
    var settingsToProperties = {
      // setting name : property name for cached value
      'findmydevice.enabled': '_enabled',
      'findmydevice.registered': '_registered',
      'findmydevice.current-clientid': '_currentClientID',
      'findmydevice.can-disable': '_canDisable'
    };
    var settings = Object.keys(settingsToProperties);

    var loaded = 0;
    var totalSettings = Object.keys(settingsToProperties).length;
    settings.forEach(function(s) {
      var prop = settingsToProperties[s];
      var helper = this[prop + 'Helper'] = SettingsHelper(s);
      helper.get((function(value) {
        this[prop] = value;
        if (++loaded === totalSettings) {
          callback && callback();
        }
      }).bind(this));
    }, this);
  },

  _initMessageHandlers: function fmd_init_message_handlers() {
    navigator.mozSetMessageHandler('push', (function(message) {
      DUMP('findmydevice got push notification!');
      this._contactServerIfEnabled();
    }).bind(this));

    navigator.mozSetMessageHandler('push-register', (function(message) {
      DUMP('findmydevice lost push endpoint, re-registering');
      this._registeredHelper.set(false);
    }).bind(this));

    navigator.mozSetMessageHandler('alarm', (function(alarm) {
      DUMP('findmydevice alarm!');
      this._contactServerIfEnabled();
      this._refreshClientIDIfRegistered(false);
    }).bind(this));

    navigator.mozSetMessageHandler('connection', (function(request) {
      var port = request.port;
      port.onmessage = (function(event) {
        if (request.keyword === 'findmydevice-wakeup') {
          DUMP('got wake up request');

          var reason = event.data;
          if (reason === IAC_API_WAKEUP_REASON_ENABLED) {
            DUMP('enabled, trying to reach the server');
            this._contactServerIfEnabled();
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
          }

          return;
        }

        if (request.keyword === 'findmydevice-test') {
            DUMP('got request for test command!');
            event.data.testing = true;
            this._processCommands(event.data);
        }
      }).bind(this);
    }).bind(this));
  },

  _contactServerIfEnabled: function fmd_contact_server() {
    if (!this._enabled) {
      return;
    }

    if (this._registered) {
      this._replyAndFetchCommands();
    } else {
      this._register();
    }
  },

  _register: function fmd_register() {
    DUMP('findmydevice attempting registration.');
    DUMP('registering: ' + this._registering);

    if (this._registering) {
      return;
    }

    this._registering = true;

    if (this._state === null) {
      // We are not registered yet, so we need to give the server a FxA
      // assertion. Request a fresh one here and continue the registration
      // process from the login callback.

      if (!this._loggedIn) {
        // Can't request() while not logged in, as that would bring up the
        // FxA dialog. Attempting a first registration while logged out is
        // theoretically possible (if, for example, a first registration
        // failed, and this is an alarm-driven re-attempt, and the user logged
        // out while we slept before this attempt), but it's a very unlikely
        // corner case. For now, just give up if this happens, but we still
        // need to notify the user somehow (bug 1013423).
        this._registering = false;
        return;
      }

      navigator.mozId.request();
    } else {
      // We don't need to send assertions on re-registrations, just rely on
      // our client ID and HAWK signature to authenticate us. This works even
      // if we're logged out of FxA, so use null for the assertion.
      this._continueRegistration(null);
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

    if (this._refreshingClientID) {
      DUMP('resuming client id refresh');
      this._fetchClientID(assertion);
    }

    if (!this._enabled || !this._registering) {
      return;
    }

    // We are in the middle of a registration, so continue here
    this._continueRegistration(assertion);
  },

  _continueRegistration: function fmd_continue_registration(assertion) {
    var self = this;

    if (assertion == null && this._state == null) {
      // this shouldn't happen
      throw new Error('Trying to register with no assertion and no state!');
    }

    var pushRequest = navigator.push.register();
    pushRequest.onsuccess = function fmd_push_handler() {
      DUMP('findmydevice received push endpoint!');

      var endpoint = pushRequest.result;
      if (self._enabled) {
        self._requestRegistration(assertion, endpoint);
      }

      self._registering = false;
    };

    pushRequest.onerror = function fmd_push_error_handler() {
      DUMP('findmydevice push request failed!');

      self._registering = false;
      self._scheduleAlarm('retry');
    };
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

    var self = this;
    Requester.post('/register/', obj, function(response) {
      DUMP('findmydevice successfully registered: ', response);

      asyncStorage.setItem('findmydevice-state', response, function() {
        self._registeredHelper.set(true);
      });
    }, this._handleServerError.bind(this));
  },

  _onLogout: function fmd_fxa_onlogout() {
    DUMP('logged out of FxA');
    this._loggedIn = false;
  },

  _onFxAError: function fmd_on_error(error) {
    DUMP('FxA error: ' + error);

    if (this._refreshingClientID) {
      this._cancelClientIDRefresh();
    }

    this._scheduleAlarm('retry');
  },

  _cancelClientIDRefresh: function fmd_cancel_clientid_refresh() {
    this._disableAttempt = false;
    this._refreshingClientID = false;

    // If we've been woken up by the Settings app because of a disable
    // attempt, it expects us to change these two settings at the end
    // of the operation, so set them to their current values if we're
    // canceling to make sure the state in the Settings is updated
    // properly.
    this._enabledHelper.set(this._enabled);
    this._currentClientIDHelper.set(this._currentClientID);
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
      return;
    }

    var request = navigator.mozAlarms.getAll();
    request.onsuccess = function fmd_alarms_get_all() {
      this.result.forEach(function(alarm) {
        navigator.mozAlarms.remove(alarm.id);
      });

      var data = {type: 'findmydevice-alarm'};
      navigator.mozAlarms.add(nextAlarm, 'honorTimezone', data);
    };
  },

  _replyAndFetchCommands: function fmd_reply_and_fetch() {
    this._reply.has_passcode = Commands.deviceHasPasscode();
    Requester.post(
      '/cmd/' + this._state.deviceid,
      this._reply,
      this._processCommands.bind(this),
      this._handleServerError.bind(this));

    this._reply = {};
  },

  _onRegisteredChanged: function fmd_registered_changed(event) {
    this._registered = event.settingValue;
    DUMP('registered: ' + this._registered);

    if (!this._registered) {
      this._contactServerIfEnabled();
    } else {
      this._loadState((function() {
        this._contactServerIfEnabled();
        this._currentClientIDHelper.set(this._state.clientid);
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
      this._refreshClientIDIfRegistered(false);
    } else {
      this._canDisableHelper.set(
        this._loggedIn &&
        this._state && (this._currentClientID === this._state.clientid));
    }
  },

  _onCanDisableChanged: function fmd_can_disable_changed(event) {
    if (event.settingValue === true && this._disableAttempt) {
      this._enabledHelper.set(false);
    }

    this._disableAttempt = false;
  },

  _refreshClientIDIfRegistered: function fmd_refresh_client_id(forceReauth) {
    DUMP('refreshing client id if registered and logged in: ',
      {registered: this._registered, loggedIn: this._loggedIn});

    if (!this._registered || !this._loggedIn) {
      return;
    }

    DUMP('requesting assertion to refresh client id, forceReauth: ' +
         forceReauth);

    this._refreshingClientID = true;
    var mozIdRequestOptions = {};
    if (forceReauth) {
      mozIdRequestOptions.refreshAuthentication = 0;
      mozIdRequestOptions.oncancel = this._cancelClientIDRefresh.bind(this);
    }

    navigator.mozId.request(mozIdRequestOptions);
  },

  _fetchClientID: function fmd_fetch_client_id(assertion) {
    Requester.post('/validate/', {assert: assertion},
      this._onClientIDResponse.bind(this),
      this._onClientIDServerError.bind(this));
    this._refreshingClientID = false;
  },

  _onClientIDResponse: function fmd_on_client_id(response) {
    DUMP('got clientid reponse: ', response);

    if (response.valid) {
      this._currentClientIDHelper.set(response.uid);
      return;
    }

    DUMP('failed to verify assertion for client id!');
    this._scheduleAlarm('retry');
  },

  _onClientIDServerError: function fmd_on_client_id_error(err) {
    DUMP('failed to fetch client id with status: ' + err.status);
    this._scheduleAlarm('retry');
    this._disableAttempt = false;
  },

  _processCommands: function fmd_process_commands(cmdobj) {
    if (cmdobj === null) {
      return;
    }

    // only do something if enabled, but bypass this check
    // while testing
    if (!this._enabled && cmdobj.testing !== true) {
      return;
    }

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

    this._scheduleAlarm('ping');
  },

  _handleServerError: function fmd_handle_server_error(err) {
    DUMP('findmydevice request failed with status: ' + err.status);
    if (err.status === 401 && this._registered) {
      this._registeredHelper.set(false);
    } else {
      this._scheduleAlarm('retry');
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
    this._contactServerIfEnabled();
  }
};

navigator.mozL10n.once(FindMyDevice.init.bind(FindMyDevice));
