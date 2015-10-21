define(function(require) {
  'use strict';

  var DialogService = require('modules/dialog_service');
  var SettingsListener = require('shared/settings_listener');

  var ScreenLock = function ctor_screenlock() {
    return {
      _settings: {
        passcodeEnabled: false,
        lockscreenEnabled: false
      },

      onInit: function sl_onInit(elements) {
        this._elements = elements;

        this._elements.passcodeEnable.addEventListener('click', this);
        this._elements.lockscreenEnable.addEventListener('click', this);
        this._elements.passcodeEditButton.addEventListener('click', this);
        this._fetchSettings();
      },

      _fetchSettings: function sl_fetchSettings() {
        SettingsListener.observe('lockscreen.enabled', false,
          function(enabled) {
            this._toggleLockscreen(enabled);
        }.bind(this));

        SettingsListener.observe('lockscreen.passcode-lock.enabled', false,
          function(enabled) {
            this._togglePasscode(enabled);
        }.bind(this));
      },

      _togglePasscode: function sl_togglePasscode(enabled) {
        this._settings.passcodeEnabled = enabled;
        this._elements.panel.dataset.passcodeEnabled = enabled;
        this._elements.passcodeEnable.checked = enabled;
      },

      _toggleLockscreen: function sl_toggleLockscreen(enabled) {
        this._settings.lockscreenEnabled = enabled;
        this._elements.panel.dataset.lockscreenEnabled = enabled;
        this._elements.lockscreenEnable.checked = enabled;
      },

      _showDialog: function sl_showDialog(mode) {
        DialogService.show('screenLock-passcode', {
          mode: mode
        });
      },

      handleEvent: function sl_handleEvent(evt) {
        switch (evt.target) {
          case this._elements.passcodeEnable:
            evt.preventDefault();
            if (this._settings.passcodeEnabled) {
              this._showDialog('confirm');
            } else {
              this._showDialog('create');
            }
            break;
          case this._elements.lockscreenEnable:
            if (this._settings.lockscreenEnabled === true &&
              this._settings.passcodeEnabled === true) {
              evt.preventDefault();
              this._showDialog('confirmLock');
            }
            break;
          case this._elements.passcodeEditButton:
            this._showDialog('edit');
            break;
        }
      }
    };
  };

  return ScreenLock;
});
