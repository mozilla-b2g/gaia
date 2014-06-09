/* global SettingsListener */
define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');

  var ScreenLock = function ctor_screenlock() {
    return {
      _panel: null,

      _settings: {
        passcodeEnabled: false,
        lockscreenEnabled: false
      },

      _getAllElements: function sl_getAllElements() {
        this.screenlockPanel = this._panel;
        this.lockscreenEnable = this._panel.querySelector('.lockscreen-enable');
        this.passcodeEnable = this._panel.querySelector('.passcode-enable');
        this.passcodeEditButton = this._panel.querySelector('.passcode-edit');
      },

      init: function sl_init() {
        this._getAllElements();
        this.passcodeEnable.addEventListener('click', this);
        this.lockscreenEnable.addEventListener('click', this);
        this.passcodeEditButton.addEventListener('click', this);
        this._fetchSettings();
      },

      onInit: function sl_onInit(panel) {
        this._panel = panel;
        this.init();
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
        this.screenlockPanel.dataset.passcodeEnabled = enabled;
        this.passcodeEnable.checked = enabled;
      },

      _toggleLockscreen: function sl_toggleLockscreen(enabled) {
        this._settings.lockscreenEnabled = enabled;
        this.screenlockPanel.dataset.lockscreenEnabled = enabled;
        this.lockscreenEnable.checked = enabled;
      },

      _showDialog: function sl_showDialog(mode) {
        SettingsService.navigate('screenLock-passcode', mode);

        // We're appending new elements to DOM so to make sure headers are
        // properly resized and centered, we emmit a lazyload event.
        // This will be removed when the gaia-header web component lands.
        window.dispatchEvent(new CustomEvent('lazyload', {
          detail: document.getElementById('screenLock-passcode')
        }));
      },

      handleEvent: function sl_handleEvent(evt) {
        switch (evt.target) {
          case this.passcodeEnable:
            evt.preventDefault();
            if (this._settings.passcodeEnabled) {
              this._showDialog('confirm');
            } else {
              this._showDialog('create');
            }
            break;
          case this.lockscreenEnable:
            if (this._settings.lockscreenEnabled === true &&
              this._settings.passcodeEnabled === true) {
              evt.preventDefault();
              this._showDialog('confirmLock');
            }
            break;
          case this.passcodeEditButton:
            this._showDialog('edit');
            break;
        }
      }
    };
  };

  return ScreenLock;
});
