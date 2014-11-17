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

  const RING_ENABLED = 'rpp.ring.enabled';
  const LOCK_ENABLED = 'rpp.lock.enabled';
  const LOCATE_ENABLED = 'rpp.locate.enabled';
  const PASSCODE_ENABLED = 'lockscreen.passcode-lock.enabled';
  const LOCKSCREEN_ENABLED = 'lockscreen.enabled';
  const LOCKSCREEN_LOCKED = 'lockscreen.locked';

  var RPPExecuteCommands = {

    _ringEnabled: false,
    _lockEnabled: false,
    _locateEnabled: false,
    _passcodeEnabled : false,
    _lockscreenEnabled : false,

    init: function() {
      Commands.init();
      this.passphrase = new PassPhrase('rppmac', 'rppsalt');

      this.observers();
      this.events();
    },

    observers: function() {
      SettingsListener.observe(LOCKSCREEN_ENABLED, false, value => {
        this._lockscreenEnabled = value;
      });

      SettingsListener.observe(PASSCODE_ENABLED, false, value => {
        this._passcodeEnabled = value;
      });

      SettingsListener.observe(RING_ENABLED, false, value => {
        this._ringEnabled = value;
      });

      SettingsListener.observe(LOCK_ENABLED, false, value => {
        this._lockEnabled = value;
      });

      SettingsListener.observe(LOCATE_ENABLED, false, value => {
        this._locateEnabled = value;
      });

      SettingsListener.observe(LOCKSCREEN_LOCKED, false, value => {
        if (!value) {
          Commands.invokeCommand('ring', [0]);
        }
      });
    },

    events: function() {
      navigator.mozSetMessageHandler('sms-received',
        this._onSMSReceived.bind(this));
    },

    /**
     * Search for RPP commands and execute them.
     *
     * @param {Object} event Object recieved from SMS listener event 'recieved'
     */
    _onSMSReceived: function(event) {
      var match, cmd, passkey, body = event.body,
          rgx = /^rpp\s(lock|ring|locate)\s([a-z0-9]{1,100})$/i,
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

    _sendSMS : function(number, message) {
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
      if (!this._lockEnabled) {
        return;
      }

      var lockReply = function(status, result) {
        if (!status) {
          console.warn('Error while trying to lock a phone, ' + result);
          return;
        }
        this._sendSMS(number, navigator.mozL10n.get('sms-lock'));
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
          return;
        }

        this._sendSMS(number, navigator.mozL10n.get('sms-locate', {
          latitude: result.coords.latitude,
          longitude: result.coords.longitude
        }));

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

  return RPPExecuteCommands;

});
