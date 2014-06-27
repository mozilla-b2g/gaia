/* global SettingsURL */
/* global SettingsListener */
/* global DUMP */
/* global SettingsHelper */

'use strict';

var Commands = {
  TRACK_UPDATE_INTERVAL_MS: 10000,

  _ringer: null,

  _lockscreenEnabled: false,

  _lockscreenPassCodeEnabled: false,

  _geolocationEnabled: false,

  init: function fmdc_init() {
    var ringer = this._ringer = new Audio();
    ringer.mozAudioChannelType = 'content';
    ringer.loop = true;

    var ringtoneURL = new SettingsURL();
    SettingsListener.observe('dialer.ringtone', '', function(value) {
      var ringing = !ringer.paused;

      ringer.pause();
      ringer.src = ringtoneURL.set(value);
      if (ringing) {
        ringer.play();
      }
    });

    var self = this;
    SettingsListener.observe('lockscreen.enabled', false, function(value) {
      self._lockscreenEnabled = value;
    });

    SettingsListener.observe('lockscreen.passcode-lock.enabled', false,
      function(value) {
        self._lockscreenPassCodeEnabled = value;
      }
    );

    SettingsListener.observe('geolocation.enabled', false, function(value) {
      self._geolocationEnabled = value;
    });
  },

  getEnabledCommands: function fmdc_get_enabled_commands() {
    var commands = Object.keys(this._commands);
    if (!this._geolocationEnabled) {
      var idx = commands.indexOf('track');
      if (idx >= 0) {
        commands.splice(idx, 1);
      }
    }

    return commands;
  },

  invokeCommand: function fmdc_get_command(name, args) {
    this._commands[name].apply(this, args);
  },

  deviceHasPasscode: function fmdc_device_has_passcode() {
    return !!(this._lockscreenEnabled && this._lockscreenPassCodeEnabled);
  },

  _setGeolocationPermission:
  function fmdc_set_geolocation_permission(successCallback, errorCallback) {
    var app = null;
    var appreq = navigator.mozApps.getSelf();

    appreq.onsuccess = function fmdc_getapp_success() {
      app = this.result;

      try {
        navigator.mozPermissionSettings.set('geolocation', 'allow',
            app.manifestURL, app.origin, false);
      } catch (exc) {
        errorCallback();
        return;
      }

      successCallback();
    };

    appreq.onerror = errorCallback;
  },

  _trackIntervalId: null,

  _trackTimeoutId: null,

  _commands: {
    track: function fmdc_track(duration, reply) {
      var self = this;

      function stop() {
        clearInterval(self._trackIntervalId);
        self._trackIntervalId = null;
        clearInterval(self._trackTimeoutId);
        self._trackTimeoutId = null;
        SettingsHelper('findmydevice.tracking').set(false);
      }

      if (this._trackIntervalId !== null || this._trackTimeoutId !== null) {
        // already tracking
        stop();
      }

      if (duration === 0) {
        reply(true);
        return;
      }

      if (!navigator.mozPermissionSettings) {
        reply(false, 'mozPermissionSettings is missing');
        return;
      }

      // set geolocation permission to true, and start requesting
      // the current position every TRACK_UPDATE_INTERVAL_MS milliseconds
      this._setGeolocationPermission(function fmdc_permission_success() {
        SettingsHelper('findmydevice.tracking').set(true);
        self._trackIntervalId = setInterval(function fmdc_track_interval() {
          duration = (isNaN(duration) || duration < 0) ? 1 : duration;
          self._trackTimeoutId = setTimeout(stop, duration * 1000);

          navigator.geolocation.getCurrentPosition(
            function fmdc_gcp_success(position) {
              DUMP('updating location to (' +
                position.coords.latitude + ', ' +
                position.coords.longitude + ')'
              );

              reply(true, position);
            }, function fmdc_gcp_error(error) {
              reply(false, 'failed to get location: ' + error.message);
            });
        }, self.TRACK_UPDATE_INTERVAL_MS);
      }, function fmdc_permission_error() {
        reply(false, 'failed to set geolocation permission!');
      });
    },

    erase: function fmdc_erase(reply) {
      var wiped = 0;
      var toWipe = ['apps', 'pictures', 'sdcard', 'videos', 'music'];

      function cursor_onsuccess(target, ds) {
        return function() {
          var file = this.result;

          if (file) {
            ds.delete(file.name);
          }

          if (!this.done) {
            this.continue();
            return;
          }

          DUMP('done wiping ' + target);
          if (++wiped == toWipe.length) {
            DUMP('all targets wiped, starting factory reset!');
            navigator.mozPower.factoryReset();

            // factoryReset() won't return, unless we're testing,
            // in which case mozPower is a mock. The reply() below
            // is thus only used for testing.
            reply(true);
          }
        };
      }

      function cursor_onerror(target) {
        return function() {
          DUMP('wipe failed to acquire cursor for ' + target);
          wiped++;
        };
      }

      toWipe = toWipe.filter(function wipe_storage(storage) {
        var ds = navigator.getDeviceStorage(storage);
        if (ds !== null) {
          var cursor = ds.enumerate();
          cursor.onsuccess = cursor_onsuccess(storage, ds);
          cursor.onerror = cursor_onerror(storage);
        }

        return ds !== null;
      });

      if (toWipe.length === 0) {
        DUMP('No storages on device, starting factory reset!');
        navigator.mozPower.factoryReset();
        reply(true);
      }
    },

    lock: function fmdc_lock(message, passcode, reply) {
      var settings = {
        'lockscreen.enabled': true,
        'lockscreen.notifications-preview.enabled': false,
        'lockscreen.passcode-lock.enabled': true,
        'lockscreen.lock-immediately': true
      };

      if (message) {
        settings['lockscreen.lock-message'] = message;
      }

      if (!this.deviceHasPasscode() && passcode) {
        settings['lockscreen.passcode-lock.code'] = passcode;
      }

      var request = SettingsListener.getSettingsLock().set(settings);
      request.onsuccess = function() {
        reply(true);
      };

      request.onerror = function() {
        reply(false, 'failed to set settings');
      };
    },

    ring: function fmdc_ring(duration, reply) {
      var ringer = this._ringer;

      function stop() {
        ringer.pause();
        ringer.currentTime = 0;
      }

      // are we already ringing?
      if (!ringer.paused) {
        if (duration === 0) {
          stop();
        }

        reply(true);
        return;
      }

      var request = SettingsListener.getSettingsLock().set({
        // hard-coded max volume taken from
        // https://wiki.mozilla.org/WebAPI/AudioChannels
        'audio.volume.content': 15
      });

      request.onsuccess = function() {
        ringer.play();
        reply(true);
      };

      request.onerror = function() {
        reply(false, 'failed to set volume');
      };

      // use a minimum duration if the value we received is invalid
      duration = (isNaN(duration) || duration <= 0) ? 1 : duration;
      setTimeout(stop, duration * 1000);
    }
  }
};

navigator.mozL10n.once(Commands.init.bind(Commands));
