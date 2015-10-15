/**
 * Command module to handle lock, ring, locate features.
 *
 * @module RPExecuteCommands
 * @return {Object}
 */
define([
  'sms/commands',
  'rp/passphrase',
  'shared/settings_listener',
  'shared/settings_helper'
],

function(Commands, PassPhrase, SettingsListener, SettingsHelper) {
  'use strict';

  const RING_ENABLED = 'rp.ring.enabled';
  const LOCK_ENABLED = 'rp.lock.enabled';
  const LOCATE_ENABLED = 'rp.locate.enabled';
  const PASSCODE_ENABLED = 'lockscreen.passcode-lock.enabled';
  const LOCKSCREEN_ENABLED = 'lockscreen.enabled';
  const LOCKSCREEN_LOCKED = 'lockscreen.locked';

  var RPExecuteCommands = {

    _ringEnabled: false,
    _lockEnabled: false,
    _locateEnabled: false,
    _passcodeEnabled : false,
    _lockscreenEnabled : false,

    init: function() {
      Commands.init();
      this.passphrase = new PassPhrase('rpmac', 'rpsalt');

      this.observers().then(() => {
        this.events();
      });

    },

    observers: function() {
      return new Promise(resolve => {
        var pending = 0;

        // Promises would be better, but SettingsListener doesn't support it.
        function finishStep() {
          pending++;
          if(pending === 6) {
            resolve();
          }
        }

        SettingsListener.observe(LOCKSCREEN_ENABLED, false, value => {
          this._lockscreenEnabled = value;
          finishStep();
        });

        SettingsListener.observe(PASSCODE_ENABLED, false, value => {
          this._passcodeEnabled = value;
          finishStep();
        });

        SettingsListener.observe(RING_ENABLED, false, value => {
          this._ringEnabled = value;
          finishStep();
        });

        SettingsListener.observe(LOCK_ENABLED, false, value => {
          this._lockEnabled = value;
          finishStep();
        });

        SettingsListener.observe(LOCATE_ENABLED, false, value => {
          this._locateEnabled = value;
          finishStep();
        });

        SettingsListener.observe(LOCKSCREEN_LOCKED, false, value => {
          if (!value) {
            Commands.invokeCommand('ring', [0]);
          }
          finishStep();
        });
      });
    },

    events: function() {
      navigator.mozSetMessageHandler('sms-received',
        this._onSMSReceived.bind(this));
    },

    /**
     * Search for RP commands and execute them.
     *
     * @param {Object} event Object received from SMS listener event 'received'
     */
    _onSMSReceived: function(event) {
      var match, cmd, passkey, body = event.body,
          rgx = /^rp\s(lock|ring|locate)\s([a-z0-9]{1,100})$/i,
          sender = event.sender;

      // If there is no passcode, do nothing.
      if (!this._passcodeEnabled || !this._lockscreenEnabled) {
        return;
      }

      match = body.match(rgx);

      if (match) {
        cmd = match[1];
        passkey = match[2];

        this.passphrase.verify(passkey).then(function(status) {
          if (!status) {
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

    _sendSMS : function(number, messageL10n) {
      var message;
      if (typeof(messageL10n) === 'string') {
        message = navigator.mozL10n.get(messageL10n);
      } else if (messageL10n.id) {
        message = navigator.mozL10n.get(messageL10n.id, messageL10n.args);
      } else {
        return;
      }

      if (navigator.mozMobileMessage) {
        navigator.mozMobileMessage.send(number, message);
      }
    },

    /**
     * Remotely rings the device
     *
     * @param  {Number} number Phone number
     */
    _ring : function(number) {
      if (!this._ringEnabled) {
        return;
      }

      var ringReply = function(res, err) {
        if (!res) {
          console.warn('Error while trying to ring a phone, ' + err);
          return;
        }

        this._sendSMS(number, 'sms-ring');

        // Lock phone
        setTimeout(function() {
          this._doLock(number);
        }.bind(this), 3000);
      }.bind(this);

      Commands.invokeCommand('ring', [600, ringReply]);
    },

    /**
     * Remotely locks the screen
     *
     * @param  {Number} number Phone number
     */
    _lock : function(number) {
      if (!this._lockEnabled) {
        return;
      }

      var lockReply = function(status, result) {
        if (!status) {
          console.warn('Error while trying to lock a phone, ' + result);
          return;
        }
        this._sendSMS(number, 'sms-lock');
      }.bind(this);

      // Lock screen
      this._doLock(number, lockReply);
    },

    /**
     * Remotely locates device and sends back reply SMS.
     *
     * @param  {Number} number Phone number
     */
    _locate : function(number) {
      if (!this._locateEnabled) {
        return;
      }

      var locateReply = function(status, result) {
        if (!status) {
          console.warn('Error while trying to locate a phone: ' + result);
        }
	else {
          this._sendSMS(number, {
            id: 'sms-locate',
            args: {
              latitude: result.coords.latitude,
              longitude: result.coords.longitude
            }
          });
        }
        // Lock phone
        setTimeout(function() {
          this._doLock(number);
        }.bind(this), 3000);
      }.bind(this);

      Commands.invokeCommand('locate', [10, locateReply]);
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

  return RPExecuteCommands;

});
