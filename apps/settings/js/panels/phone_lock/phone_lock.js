/* global SettingsListener */
define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');
  var PhoneLock = function ctor_phonelock() {
    return {
      panel: null,

      settings: {
        passcodeEnable: false,
        lockscreenEnable: false
      },

      getAllElements: function pl_getAllElements() {
        this.phonelockPanel = this.panel;
        this.lockscreenEnable = this.panel.querySelector('#lockscreen-enable');
        this.passcodeEnable = this.panel.querySelector('#passcode-enable');
        this.passcodeEditButton = this.panel.querySelector('#passcode-edit');
      },

      init: function pl_init() {
        this.getAllElements();
        this.passcodeEnable.addEventListener('click', this);
        this.lockscreenEnable.addEventListener('click', this);
        this.passcodeEditButton.addEventListener('click', this);
        this.fetchSettings();
      },

      onInit: function(panel) {
        this.panel = panel;
        this.init();
      },

      fetchSettings: function pl_fetchSettings() {
        SettingsListener.observe('lockscreen.enabled', false,
          function(enabled) {
            this.toggleLock(enabled);
        }.bind(this));

        SettingsListener.observe('lockscreen.passcode-lock.enabled', false,
          function(enabled) {
            this.settings.passcodeEnable = enabled;
            this.phonelockPanel.dataset.passcodeEnabled = enabled;
            this.passcodeEnable.checked = enabled;
        }.bind(this));
      },

      toggleLock: function pl_toggleLock(enable) {
        this.settings.lockscreenEnable = enable;
        this.phonelockPanel.dataset.lockscreenEnabled = enable;
        this.lockscreenEnable.checked = enable;
      },

      showDialog: function pl_showDialog(mode) {
        SettingsService.navigate('phoneLock-passcode', mode);
      },

      handleEvent: function pl_handleEvent(evt) {
        switch (evt.target) {
          case this.passcodeEnable:
            evt.preventDefault();
            if (this.settings.passcodeEnable) {
              this.showDialog('confirm');
            } else {
              this.showDialog('create');
            }
            break;
          case this.lockscreenEnable:
            if (this.settings.lockscreenEnable === true &&
              this.settings.passcodeEnable === true) {
              evt.preventDefault();
              this.showDialog('confirmLock');
            }
            break;
          case this.passcodeEditButton:
            this.showDialog('edit');
            break;
        }
      }
    };
  };

  return PhoneLock;
});
