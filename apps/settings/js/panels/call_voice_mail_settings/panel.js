define(function(require) {
  'use strict'; 

  var DialogPanel = require('modules/dialog_panel');
  var SettingsCache = require('modules/settings_cache');

  return function ctor_call_voice_mail_settings() {
    return DialogPanel({
      onInit: function(panel) {
        this._currentSimIndex = 0;
        this._elements = {
          vmNumberInput: panel.querySelector('.vm-number')
        };
      },
      onBeforeShow: function() {
        // TODO
        // remove this later
        this._currentSimIndex =
          window.DsdsSettings.getIccCardIndexForCallSettings();

        return this._getVoicemailNumber().then((number) => {
          this._elements.vmNumberInput.value = number;
        });
      },
      onShow: function() {
        // For better UX
        var cursorPos = this._elements.vmNumberInput.value.length;
        this._elements.vmNumberInput.focus();
        this._elements.vmNumberInput.setSelectionRange(0, cursorPos);
      },
      onSubmit: function() {
        // We have to set the mbdn value back to db
        SettingsCache.getSettings((results) => {
          var numbers = results['ril.iccInfo.mbdn'] || [];
          numbers[this._currentSimIndex] = this._elements.vmNumberInput.value;
          navigator.mozSettings.createLock().set({
            'ril.iccInfo.mbdn': numbers
          });
        });
      },
      _getVoicemailNumber: function() {
        var self = this;
        var promise = new Promise(function(resolve) {
          SettingsCache.getSettings(function(results) {
            var numbers = results['ril.iccInfo.mbdn'];
            var number = numbers && numbers[self._currentSimIndex];
            resolve(number || '');
          });
        });
        return promise;
      }
    });
  };
});
