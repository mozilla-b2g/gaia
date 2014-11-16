/**
 * Command module to handle lock, ring, locate features.
 *
 * @module Commands
 * @return {Object}
 */
define([
  'shared/settings_listener',
  'shared/settings_helper'
],

function(SettingsListener, SettingsHelper) {
  'use strict';

  var Commands = {
    TRACK_UPDATE_INTERVAL_MS: 10000,

    _ringer: null,

    _lockscreenEnabled: false,

    _lockscreenPassCodeEnabled: false,

    _geolocationEnabled: false,

    init: function fmdc_init() {
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
        reply = reply || function() {};
        reply(true, {
          coords: {
            latitude: 51,
            longitude: 13
          }
        });
      },

      lock: function fmdc_lock(message, passcode, reply) {
        reply = reply || function() {};
        reply(true);
      },

      ring: function fmdc_ring(duration, reply) {
        reply = reply || function() {};
        reply(true);
      }
    }
  };

  return Commands;

});
