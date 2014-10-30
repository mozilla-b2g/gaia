/**
 * Command module to handle lock, ring, locate features.
 * 
 * @module RPPExecuteCommands
 * @return {Object}
 */
define([
  'sms/commands',
  'rpp/passphrase',
  'shared/settings_listener',
  'shared/settings_helper'
],

function(Commands, PassPhrase, SettingsListener, SettingsHelper) {
  'use strict';

  var RING_ENABLED = 'rpp.ring.enabled';
  var LOCK_ENABLED = 'rpp.lock.enabled';
  var LOCATE_ENABLED = 'rpp.locate.enabled';
  var PASSCODE_ENABLED = 'lockscreen.passcode-lock.enabled';

  var RPPExecuteCommands = {

    _ringEnabled: false,
    _lockEnabled: false,
    _locateEnabled: false,
    _wipeEnabled: false,
    _resetRequired : false,
    _passcodeEnabled : false,
    _lockscreenEnabled : false,
    _deviceId : null,
    _timestamps: [],

    init: function() {
      Commands.init();
      this.passphrase = new PassPhrase('rppmac', 'rppsalt');

      this._getSettings();
      this._observeSettings();
      this._addListener();

      // get settings
      SettingsListener.observe('lockscreen.enabled', false,
        function(value) {
          this._lockscreenEnabled = value;
        }.bind(this)
      );
    },

    _getSettings: function() {
      var self = this;

      var settings = navigator.mozSettings;
      if (!settings) {
        return;
      }

      var lock = settings.createLock();
      if (!lock) {
        return;
      }

      var reqRing = lock.get(RING_ENABLED);
      if (reqRing) {
        reqRing.onsuccess = function() {
          var value = reqRing.result[RING_ENABLED];
          if (typeof value === 'boolean') {
            self._ringEnabled = value;
          } else if (typeof value === 'string') {
            self._ringEnabled = (value === 'true');
          }
        };

        reqRing.onerror = function() {};
      }

      var reqLock = lock.get(LOCK_ENABLED);
      if (reqLock) {
        reqLock.onsuccess = function() {
          var value = reqLock.result[LOCK_ENABLED];
          if (typeof value === 'boolean') {
            self._lockEnabled = value;
          } else if (typeof value === 'string') {
            self._lockEnabled = (value === 'true');
          }
        };

        reqLock.onerror = function() {};
      }

      var reqLocate = lock.get(LOCATE_ENABLED);
      if (reqLocate) {
        reqLocate.onsuccess = function() {
          var value = reqLocate.result[LOCATE_ENABLED];
          if (typeof value === 'boolean') {
            self._locateEnabled = value;
          } else if (typeof value === 'string') {
            self._locateEnabled = (value === 'true');
          }
        };

        reqLocate.onerror = function() {};
      }

      var passcodeReq = lock.get(PASSCODE_ENABLED);
      if (passcodeReq) {
        passcodeReq.onsuccess = function() {
          var value = passcodeReq.result[PASSCODE_ENABLED];
          if (typeof value === 'boolean') {
            self._passcodeEnabled = value;
          } else if (typeof value === 'string') {
            self._passcodeEnabled = (value === 'true');
          }
        };

        passcodeReq.onerror = function() {};
      }
    },

    _observeSettings: function() {
      var settings = navigator.mozSettings;
      if (settings) {
        settings.addObserver(RING_ENABLED,
          this._onSettingsChanged.bind(this));
        settings.addObserver(LOCK_ENABLED,
          this._onSettingsChanged.bind(this));
        settings.addObserver(LOCATE_ENABLED,
          this._onSettingsChanged.bind(this));
        settings.addObserver(PASSCODE_ENABLED,
          this._onSettingsChanged.bind(this));
      }
    },

    _onSettingsChanged: function(event) {
      var name = event.settingName;
      var value = event.settingValue;

      if (name === RING_ENABLED) {
        if (typeof value === 'boolean') {
          this._ringEnabled = value;
        } else if (typeof value === 'string') {
          this._ringEnabled = (value === 'true');
        }
      } else if (name === LOCK_ENABLED) {
        if (typeof value === 'boolean') {
          this._lockEnabled = value;
        } else if (typeof value === 'string') {
          this._lockEnabled = (value === 'true');
        }
      } else if (name === LOCATE_ENABLED) {
        if (typeof value === 'boolean') {
          this._locateEnabled = value;
        } else if (typeof value === 'string') {
          this._locateEnabled = (value === 'true');
        }
      } else if (name === PASSCODE_ENABLED) {
        if (typeof value === 'boolean') {
          this._passcodeEnabled = value;
        } else if (typeof value === 'string') {
          this._passcodeEnabled = (value === 'true');
        }
      }
    },

    _addListener: function() {
      var mobileMessage = navigator.mozMobileMessage;
      if (mobileMessage) {
        mobileMessage.addEventListener('received',
          this._onSMSReceived.bind(this));
      }
    },

    /**
     * Search for RPP commands and execute them.
     *
     * @param {Object} event Object recieved from SMS listener event 'recieved'
     */
    _onSMSReceived: function(event) {
      var match, cmd, passkey, body = event.message.body,
          rgx = /^rpp\s(lock|ring|locate)\s([a-z0-9]{1,100})$/i,
          sender = event.message.sender;

      // If there is no passcode, do nothing.
      if ( ! this._passcodeEnabled || ! this._lockscreenEnabled) {
        return;
      }

      match = body.match(rgx);

      if (match) {
        cmd = match[1];
        passkey = match[2];

        this.passphrase.verify(passkey).then(function(status) {
          if ( ! status) {
            return;
          }

          switch(cmd.toLowerCase()) {
            case 'lock':
              this._lock(sender);
              break;
            case 'ring':
              this._ring(sender);
              break;
            case 'locate':
              this._locate(sender);
              break;
            default:
              break;
          }
        }.bind(this));
      }
    },

    _sendSMS : function(number, message) {
      if (navigator.mozMobileMessage) {
        navigator.mozMobileMessage.send(number, message);
      }
    },

    _ring : function(number) {
      if ( ! this._ringEnabled) {
        return;
      }

      var ringReply = function(res, err) {
        if ( ! res) {
          console.warn('Error while trying to ring a phone, ' + err);
          return;
        }

        this._sendSMS(number, navigator.mozL10n.get('sms-ring'));

        // Lock phone
        setTimeout(function() {
          this._doLock(number);
        }.bind(this), 3000);
      }.bind(this);

      Commands.invokeCommand('ring', [86400, ringReply]);
    },

    /**
     * Remotely locks the screen
     * 
     * @param  {Number} number Phone number
     */
    _lock : function(number) {
      if ( ! this._lockEnabled) {
        return;
      }

      var lockReply = function(res, err) {
        if ( ! res) {
          console.warn('Error while trying to lock a phone, ' + err);
          return;
        }
        this._sendSMS(number, navigator.mozL10n.get('sms-lock'));
      }.bind(this);

      // Lock screen
      this._doLock(number, lockReply);
    },

    _locate : function(number) {
      if ( ! this._locateEnabled) {
        return;
      }

      var locateReply = function(res, pos) {
        var lat, lon;

        if ( ! res) {
          console.warn('Error while trying to locate a phone, ' + pos);
          return;
        }

        lat = pos.coords.latitude;
        lon = pos.coords.longitude;

        this._sendSMS(number, navigator.mozL10n.get('sms-locate', {
          coords: lat + ',' + lon
        }));

        // Lock phone
        setTimeout(function() {
          this._doLock(number);
        }.bind(this), 3000);
      }.bind(this);

      Commands.invokeCommand('track', [6, locateReply]);
    },

    /**
     * Perform lockscreen
     * 
     * @param  {Number} number Phone number
     */
    _doLock : function(number, reply) {
      reply = reply || function() {};
      Commands.invokeCommand('lock', [null, null, reply]);
    }

  };

  return RPPExecuteCommands;

});
