/* global DUMP, SettingsHelper, SettingsListener, SettingsURL, FindMyDevice,
          PasscodeHelper */

'use strict';

var Commands = {
  TRACK_UPDATE_INTERVAL_MS: 10000,

  _ringer: null,

  _lockscreenEnabled: false,

  _lockscreenPassCodeEnabled: false,

  _geolocationEnabled: false,

  init: function fmdc_init() {
    var ringer = this._ringer = new Audio();
    ringer.mozAudioChannelType = 'ringer';
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
    FindMyDevice.beginHighPriority('command');
    this._commands[name].apply(this, args);
  },

  deviceHasPasscode: function fmdc_device_has_passcode() {
    return !!(this._lockscreenEnabled && this._lockscreenPassCodeEnabled);
  },

  _watchPositionId: null,

  _trackTimeoutId: null,

  _ringTimeoutId: null,

  _commands: {
    track: function fmdc_track(duration, reply) {
      var self = this;

      function stop() {
        navigator.geolocation.clearWatch(self._watchPositionId);
        self._watchPositionId = null;
        clearTimeout(self._trackTimeoutId);
        self._trackTimeoutId = null;
        SettingsHelper('findmydevice.tracking').set(false);
        FindMyDevice.endHighPriority('command');
      }

      if (this._watchPositionId !== null || this._trackTimeoutId !== null) {
        // already tracking
        stop();
      }

      if (duration === 0) {
        if (reply) {
          reply(true);
        }
        FindMyDevice.endHighPriority('command');
        return;
      }

      var lastPositionTimestamp = 0;

      // start watching the current position, but throttle updates to one
      // every TRACK_UPDATE_INTERVAL_MS
      SettingsHelper('findmydevice.tracking').set(true);
      self._watchPositionId = navigator.geolocation.watchPosition(
      function(position) {
        DUMP('received location (' +
          position.coords.latitude + ', ' +
          position.coords.longitude + ')'
        );

        var timeElapsed = position.timestamp - lastPositionTimestamp;
        if (timeElapsed < self.TRACK_UPDATE_INTERVAL_MS) {
          DUMP('ignoring position due to throttling');
          return;
        }

        lastPositionTimestamp = position.timestamp;
        reply(true, position);
      }, function(error) {
        reply(false, 'failed to get location: ' + error.message);
      });

      duration = (isNaN(duration) || duration < 0) ? 1 : duration;
      self._trackTimeoutId = setTimeout(stop, duration * 1000);
    },

    erase: function fmdc_erase(reply) {
      navigator.mozPower.factoryReset('wipe');

      // factoryReset() won't return, unless we're testing,
      // in which case mozPower is a mock. The reply() below
      // is thus only used for testing.
      reply(true);
    },

    killswitch: function fmdc_killswitch(reply) {
      if (navigator.mozKillSwitch) {
        navigator.mozKillSwitch.enable();
      }

      FindMyDevice.endHighPriority('command');
      reply(true);
    },

    lock: function fmdc_lock(message, passcode, reply) {
      var pr;
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
        pr = PasscodeHelper.set(passcode);
      }

      var request = SettingsListener.getSettingsLock().set(settings);

      Promise.all([pr, request]).then(() => {
        reply(true);
      }).catch(() => {
        reply(false);
      });

      FindMyDevice.endHighPriority('command');
    },

    ring: function fmdc_ring(duration, reply) {
      var ringer = this._ringer;

      var stop = function() {
        ringer.pause();
        ringer.currentTime = 0;
        clearTimeout(this._ringTimeoutId);
        this._ringTimeoutId = null;
        FindMyDevice.endHighPriority('command');
      }.bind(this);

      var ringing = !ringer.paused || this._ringTimeoutId !== null;
      if (ringing || duration === 0) {
        if (ringing && duration === 0) {
          stop();
        }

        if (reply) {
          reply(true);
        }
        FindMyDevice.endHighPriority('command');
        return;
      }

      var request = SettingsListener.getSettingsLock().set({
        // hard-coded max volume taken from
        // https://wiki.mozilla.org/WebAPI/AudioChannels
        'audio.volume.notification': 15
      });

      request.onsuccess = function() {
        ringer.play();
        reply(true);
      };

      request.onerror = function() {
        reply(false, 'failed to set volume');
      };

      this._ringTimeoutId = setTimeout(stop, duration * 1000);
    }
  }
};

Commands.init();
