'use strict';

var Voicemail = {
  _simNumber: undefined,

  _reset: function vm_reset() {
    this._simNumber = undefined;
    this._settingsNumber = undefined;
  },

  // Returns the voicemail number from the SIM card if present
  get simNumber() {
    if (this._simNumber === undefined) {
      if (!navigator.mozVoicemail) {
        this._simNumber = null;
      }
      this._simNumber = navigator.mozVoicemail.number;
    }

    return this._simNumber;
  },

  _settingsNumber: undefined,

  // Returns the voicemail number with the mozSetting value
  // based on /shared/resources/apn.json
  _getSettingsNumber: function vm_getSettingsNumber(callback) {
    if (this._settingsNumber !== undefined) {
      setTimeout(callback, 0, this._settingsNumber);
      return;
    }

    var settings = navigator.mozSettings;
    var self = this;
    settings.addObserver('ril.iccInfo.mbdn', function(event) {
      self._settingsNumber = event.settingValue;
    });

    var req = settings.createLock().get('ril.iccInfo.mbdn');
    req.onsuccess = function getVoicemailNumber() {
      self._settingsNumber = req.result['ril.iccInfo.mbdn'];
      setTimeout(callback, 0, self._settingsNumber);
    };

    req.onerror = function getVoicemailNumberError() {
      self._settingsNumber = null;
      setTimeout(callback, 0, self._settingsNumber);
    };
  },

  check: function vm_check(number, callback) {
    // check the voicemail number if the number is in the sim card
    if (this.simNumber == number) {
      callback(true);
      return;
    }

    this._getSettingsNumber(function(settingsNumber) {
      var isVoicemailNumber = false;
      if (settingsNumber == number) {
        isVoicemailNumber = true;
      }
      callback(isVoicemailNumber);
    });
  }
};
