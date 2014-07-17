/* global DUMP, Promise, SettingsHelper, SettingsListener, SettingsURL */

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

    // TODO: extract utils out to a separate file
    erase: function fmdc_erase(reply) {
      // storage that doesn't live on an sdcard
      var storageTypes = ['apps', 'crashes'];
      var processed = [];

      var sdcards = navigator.getDeviceStorages('sdcard');
      sdcards.forEach(function(card, i) {
        var donePromise = new Promise(function(resolve, reject) {
          formatCard(card, resolve);
        });
        processed.push(donePromise);
      });

      storageTypes.forEach(function(storage) {
        // some of the returned deviceStorages will be pictures or videos on
        // an sdcard. we are separately formatting the sdcards, so here
        // we want to ignore those. if storage is on an sdcard, then
        // storage.canBeFormatted == true.
        var deviceStorages = navigator.getDeviceStorages(storage);
        deviceStorages.forEach(function(ds, i) {
          if (ds === null || ds.canBeFormatted) {
            return;
          }
          var id = storage + i;
          var donePromise = new Promise(function(resolve, reject) {
            var cursor = ds.enumerate();
            cursor.onsuccess = cursor_onsuccess(id, ds, resolve);
            cursor.onerror = cursor_onerror(id, resolve);
          });
          processed.push(donePromise);
        });
      });

      Promise.all(processed).then(resetDevice);

      function resetDevice(messages) {
        // Promise.all will pass in an array of messages, one per resolved
        // promise - we use this to pass back error responses
        messages.forEach(function(msg) {
          if (msg) {
            DUMP(msg);
          }
        });

        DUMP('all storages processed, starting factory reset!');
        navigator.mozPower.factoryReset();

        // factoryReset() won't return, unless we're testing,
        // in which case mozPower is a mock. The reply() below
        // is thus only used for testing.
        reply(true);
      }

      /* the utils. to be extracted into a separate file. */

      // state transitions: from gonk DeviceStorage / the brain of dhylands
      //
      // There are 4 final states, and they are all handled by formatCard.
      // We implicitly handle the 4 temporary states by just continuing to
      // poll if we encounter them.
      //
      // Handling the final states:
      //
      // Shared:
      // When a card is Shared, that means USB is connected. For now, bail.
      // (We *could* wait a really long time for the status to change.)
      //
      // NoMedia:
      // Similarly, if no card is found, NoMedia is the state we get. Bail.
      //
      // Mounted:
      // If a card is Mounted, we want to unmount it, then wait for it to
      // transition Mounted -> Unmounting -> Idle. So we will call unmount(),
      // then just poll until it goes Idle. The AutoMounter detects that we
      // asked to unmount this volume, so it will leave it alone (compare the
      // notes for the on_format_success method).
      //
      // Idle:
      // Finally, if a card is Idle, then there are no open files, and we can
      // safely format it. We use the on_format_success method to handle the
      // post-format() states.
      function formatCard(card, cb) {
        var count = 0;
        // 30 rounds of 1 second each = 30 seconds
        var interval = 1000;
        var maxCount = 30;
        function _poll() {
          var statusReq = card.storageStatus();
          statusReq.onerror =
          statusReq.onsuccess = function on_storage_status() {
            var status = this.result;
            count++;
            if (count > maxCount) {
              return cb('Error: timeout waiting to format card ' +
                        card.storageName);
            } else if (status === 'Idle') {
              var formatReq = card.format();
              formatReq.onsuccess =
                on_format_success.bind(null, card, cb);
              // give up if formatting fails to start
              formatReq.onerror = function sdcard_format_error() {
                cb('Unable to format card ' + card.storageName);
              };
              return;
            } else if (status === 'Shared' || status === 'NoMedia') {
              return cb('Unable to format ' + card.storageName +
                        ', status is ' + status);
            } else if (status === 'Mounted') {
              card.unmount();
              // restart the timer to give the card plenty of time to unmount
              count = 0;
            }
            // either we just unmounted, or we are in a temporary state
            setTimeout(_poll, interval);
          };
        }
        _poll();
      }

      // state transitions: after format() is called, if this callback is
      // fired, we know the device is being formatted, but isn't necessarily
      // done yet. The device.status state goes from Idle to Formatting, and
      // when it's done formatting, from Formatting to Idle, but the
      // AutoMounter will detect the Idle and rapidly mount the device. This
      // means the device will change states again - but we know the state will
      // no longer be Formatting, so, if status !== 'Formatting', we're done.
      function on_format_success(c, cb) {
        var count = 0;
        // 120 rounds of 30 seconds = 60 minutes
        var interval = 30 * 1000;
        var maxCount = 120;
        function _poll() {
          var req = c.storageStatus();
          req.onerror =
          req.onsuccess = function on_storage_status() {
            var status = this.result;
            count++;
            if (count > maxCount) {
              return cb('Timeout: formatting ' + c.storageName +
                        ' took over 1 hour');
            } else if (status !== 'Formatting') {
              return cb();
            }
            setTimeout(_poll, interval);
          };
        }
        _poll();
      }

      function cursor_onsuccess(target, ds, cb) {
        return function() {
          var cursor = this;
          var file = cursor.result;

          if (!file) {
            return cb('onsuccess called with null file, done enumerating ' +
                 target);
          }

          DUMP('deleting: ' + file.name);

          var request = ds.delete(file.name);
          request.onsuccess =
          request.onerror = function fmdc_delete_complete() {
            DUMP('done deleting ' + file.name);
            cursor.continue();
          };
        };
      }

      function cursor_onerror(target, cb) {
        return function() {
          cb('wipe failed to acquire cursor for ' + target);
        };
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
