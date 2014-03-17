/* global SettingsHelper */
/* global asyncStorage */
/* global Requester */
/* global Commands */
/* global Config */
/* global DUMP */

'use strict';

var FindMyDevice = {
  _state: null,

  _registering: false,

  _reply: {},

  _registered: false,

  _registeredHelper: SettingsHelper('findmydevice.registered'),

  _enabled: false,

  _enabledHelper: SettingsHelper('findmydevice.enabled'),

  init: function fmd_init() {
    var self = this;
    var settings = navigator.mozSettings;

    navigator.mozId.watch({
      wantIssuer: 'firefox-accounts',
      audience: Config.api_url,
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
      if (request.keyword === 'findmydevice-wakeup') {
        DUMP('got wake up request');
        self._contactServerIfEnabled();
      }
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

    // Refresh the assertion we have to make sure it's not expired.
    // This shouldn't bring up the Firefox Accounts dialog because that
    // would only happen if it is logged out, and in that case Find My Device
    // would have been disabled. We will continue the registration process
    // once we get a new assertion.
    navigator.mozId.request();
  },

  _onLogin: function fmd_on_login(assertion) {
    if (!this._enabled || !this._registering) {
      return;
    }

    // We are in the middle of a registration, so continue here by obtaining a
    // push endpoint

    var self = this;
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
      assert: assertion,
      pushurl: endpoint
    };

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
    this._enabledHelper.set(false);
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
    if (!this._enabled || cmdobj === null) {
      return;
    }


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
      args.push(this._replyCallback.bind(this, cmd));
      Commands[command].apply(Commands, args);
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
      value.ti = retval.timestamp;
    } else if (ok === false) {
      value.error = retval;
    }

    this._reply[cmd] = value;
    this._contactServerIfEnabled();
  }
};

navigator.mozL10n.ready(FindMyDevice.init.bind(FindMyDevice));
