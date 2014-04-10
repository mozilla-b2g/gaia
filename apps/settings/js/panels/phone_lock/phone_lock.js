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
        var settings = navigator.mozSettings;
        var lock = settings.createLock();
        var self = this;

        // TODO
        // improve the following stuffs with new API

        var reqLockscreenEnable = lock.get('lockscreen.enabled');
        reqLockscreenEnable.onsuccess = function onLockscreenEnableSuccess() {
          var enable = reqLockscreenEnable.result['lockscreen.enabled'];
          self.toggleLock(enable);
        };

        var reqPasscodeEnable = lock.get('lockscreen.passcode-lock.enabled');
        reqPasscodeEnable.onsuccess = function onPasscodeEnableSuccess() {
          var enable =
            reqPasscodeEnable.result['lockscreen.passcode-lock.enabled'];
          self.settings.passcodeEnable = enable;
          self.phonelockPanel.dataset.passcodeEnabled = enable;
          self.passcodeEnable.checked = enable;
        };

        settings.addObserver('lockscreen.enabled',
          function onLockscreenEnabledChange(event) {
            var enable = event.settingValue;
            self.toggleLock(enable);
        });

        settings.addObserver('lockscreen.passcode-lock.enabled',
          function onPasscodeLockEnableChange(event) {
            self.settings.passcodeEnable = event.settingValue;
            self.phonelockPanel.dataset.passcodeEnabled = event.settingValue;
            self.passcodeEnable.checked = event.settingValue;
        });
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
