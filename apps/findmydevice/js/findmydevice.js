/* global SettingsHelper */
/* global asyncStorage */
/* global Requester */
/* global Commands */
/* global Config */
/* global DUMP */

'use strict';

// XXX keep this in sync with apps/system/js/findmydevice_launcher.js
const IAC_API_WAKEUP_REASON_ENABLED = 0;
const IAC_API_WAKEUP_REASON_STALE_REGISTRATION = 1;

var FindMyDevice = {
  _state: null,

  _registering: false,

  _reply: {},

  _registered: false,

  _registeredHelper: SettingsHelper('findmydevice.registered'),

  _enabled: false,

  _enabledHelper: SettingsHelper('findmydevice.enabled'),

  _loggedIn: false,

  init: function fmd_init() {
    var self = this;
    var settings = navigator.mozSettings;

    navigator.mozId.watch({
      wantIssuer: 'firefox-accounts',
      audience: Config.audience_url,
      onready: self._onReady.bind(self),
      onlogin: self._onLogin.bind(self),
      onlogout: self._onLogout.bind(self)
    });

    settings.addObserver('findmydevice.registered', function(event) {
      self._registered = event.settingValue;

      if (self._registered === false) {
        self._contactServerIfEnabled();
      } else {
        self._loadState(self._contactServerIfEnabled.bind(self));
      }
    });

    settings.addObserver('findmydevice.enabled', function(event) {
      self._enabled = event.settingValue;

      // No need to contact the server here if we've been enabled,
      // since that means we'll get a wake up request from the System
      // app
    });
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
    var self = this;

    this._registeredHelper.get(function fmd_get_registered(value) {
      self._registered = value;
      loadEnabledSetting();
    });

    function loadEnabledSetting() {
      self._enabledHelper.get(function fmd_get_enabled(value) {
        self._enabled = value;
        callback && callback();
      });
    }
  },

  _initMessageHandlers: function fmd_init_message_handlers() {
    var self = this;

    navigator.mozSetMessageHandler('push', function(message) {
      DUMP('findmydevice got push notification!');
      self._contactServerIfEnabled();
    });

    navigator.mozSetMessageHandler('push-register', function(message) {
      DUMP('findmydevice lost push endpoint, re-registering');
      self._registeredHelper.set(false);
    });

    navigator.mozSetMessageHandler('alarm', function(alarm) {
      DUMP('findmydevice alarm!');
      self._contactServerIfEnabled();
    });

    navigator.mozSetMessageHandler('connection', function(request) {
      var port = request.port;
      port.onmessage = function(event) {
        if (request.keyword === 'findmydevice-wakeup') {
          DUMP('got wake up request');

          var reason = event.data;
          if (reason === IAC_API_WAKEUP_REASON_ENABLED) {
            DUMP('enabled, trying to reach the server');
            self._contactServerIfEnabled();
          } else if (reason === IAC_API_WAKEUP_REASON_STALE_REGISTRATION) {
            DUMP('stale registration, re-registering');
            self._registeredHelper.set(false);
          }

          return;
        }

        if (request.keyword === 'findmydevice-test') {
            DUMP('got request for test command!');
            event.data.testing = true;
            self._processCommands(event.data);
        }
      };
    });
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
    this._loggedIn = true;

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
    this._loggedIn = false;
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
