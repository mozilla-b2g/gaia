/**
 * Command module to handle lock, ring, locate features.
 * 
 * @module Commands
 * @return {Object}
 */
define([
  'shared/settings_listener',
  'shared/settings_helper',
  'shared/settings_url'
],

function(SettingsListener, SettingsHelper, SettingsURL) {
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

    invokeCommand: function fmdc_get_command(name, args) {
      this._commands[name].apply(this, args);
    },

    deviceHasPasscode: function fmdc_device_has_passcode() {
      return !!(this._lockscreenEnabled && this._lockscreenPassCodeEnabled);
    },

    _ringTimeoutId: null,

    _commands: {
      locate: function fmdc_track(duration, reply) {
        var options = {
          enableHighAccuracy: true,
          timeout: duration * 1000,
          maximumAge: 0
        };

        reply = reply || function() {};

        function success(position) {
          reply(true, position);
        }

        function error(err) {
          reply(false, err.message);
        }

        navigator.geolocation.getCurrentPosition(success, error, options);
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

        var stop = function() {
          ringer.pause();
          ringer.currentTime = 0;
          clearTimeout(this._ringTimeoutId);
          this._ringTimeoutId = null;
        }.bind(this);

        var ringing = !ringer.paused || this._ringTimeoutId !== null;
        if (ringing || duration === 0) {
          if (ringing && duration === 0) {
            stop();
          }

          if (reply) {
            reply(true);
          }
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

  return Commands;

});
