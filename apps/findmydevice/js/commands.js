/* global SettingsURL */
/* global SettingsListener */
/* global DUMP */

'use strict';

var Commands = {
  _ringer: null,

  _lockscreenEnabled: false,

  _lockscreenPassCodeEnabled: false,

  init: function fmdc_init() {
    var ringer = this._ringer = new Audio();
    ringer.mozAudioChannel = 'content';
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

  },

  deviceHasPasscode: function fmdc_device_has_passcode() {
    return this._lockscreenEnabled && this.lockscreenPassCodeEnabled;
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

  _watchPositionId: null,

  track: function fmdc_track(duration, reply) {
    // We actually ignore duration if it's nonzero. If zero, stop
    // tracking.

    if (this._watchPositionId !== null) {
      if (duration === 0) {
        // stop tracking
        navigator.geolocation.clearWatch(this._watchPositionId);
        this._watchPositionId = null;
      }

      reply(true);
      return;
    }

    if (!navigator.mozPermissionSettings) {
      reply(false, 'mozPermissionSettings is missing');
      return;
    }

    var self = this;
    this._setGeolocationPermission(function fmdc_permission_success() {
      self._watchPositionId = navigator.geolocation.watchPosition(
        function fmdc_watchposition_success(position) {
          DUMP('updating location to (' +
            position.coords.latitude + ', ' +
            position.coords.longitude + ')'
          );

          reply(true, position);
        }, function fmdc_watchposition_error(error) {
          reply(false, 'failed to get location: ' + error.message);
        }
      );
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

    toWipe.forEach(function wipe_storage(storage) {
      var ds = navigator.getDeviceStorage(storage);
      var cursor = ds.enumerate();
      cursor.onsuccess = cursor_onsuccess(storage, ds);
      cursor.onerror = cursor_onerror(storage);
    });
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
};

navigator.mozL10n.ready(Commands.init.bind(Commands));
