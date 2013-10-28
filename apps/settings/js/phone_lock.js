/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var PhoneLock = {
  settings: {
    passcodeEnable: false
  },

  getAllElements: function pl_getAllElements() {
    this.closeSheet = document.getElementById('close-sheet');
    this.lockscreenEnable = document.getElementById('lockscreen-enable');
    this.passcodeEnable = document.getElementById('passcode-enable');
    this.passcodeEditButton = document.getElementById('passcode-edit');
    this.phonelockPanel = document.getElementById('phoneLock');
  },

  init: function pl_init() {
    this.getAllElements();
    this.closeSheet.addEventListener('click', sheet.close);
    this.passcodeEnable.addEventListener('click', this);
    this.passcodeEditButton.addEventListener('click', this);

    this.fetchSettings();
  },

  fetchSettings: function pl_fetchSettings() {
    var _ = navigator.mozL10n.get;
    var settings = navigator.mozSettings;

    var lock = settings.createLock();
    var self = this;

    var reqLockscreenEnable = lock.get('lockscreen.enabled');
    reqLockscreenEnable.onsuccess = function onLockscreenEnableSuccess() {
      var enable = reqLockscreenEnable.result['lockscreen.enabled'];
      self.phonelockPanel.dataset.lockscreenEnabled = enable;
      self.lockscreenEnable.checked = enable;
    };

    var reqPasscodeEnable = lock.get('lockscreen.passcode-lock.enabled');
    reqPasscodeEnable.onsuccess = function onPasscodeEnableSuccess() {
      var enable = reqPasscodeEnable.result['lockscreen.passcode-lock.enabled'];
      self.settings.passcodeEnable = enable;
      self.phonelockPanel.dataset.passcodeEnabled = enable;
      self.passcodeEnable.checked = enable;
    };

    settings.addObserver('lockscreen.enabled',
      function onLockscreenEnabledChange(event) {
        var enable = event.settingValue;
        self.phonelockPanel.dataset.lockscreenEnabled = enable;
    });

    settings.addObserver('lockscreen.passcode-lock.enabled',
      function onPasscodeLockEnableChange(event) {
        self.settings.passcodeEnable = event.settingValue;
        self.phonelockPanel.dataset.passcodeEnabled = event.settingValue;
        self.passcodeEnable.checked = event.settingValue;
    });
  },

  changeMode: function pl_changeMode(mode) {
    sheet.open('/pages/phone_lock_passcode.html', {
      mode: mode
    });
  },

  handleEvent: function pl_handleEvent(evt) {
    switch (evt.target) {
      case this.passcodeEnable:
        evt.preventDefault();
        if (this.settings.passcodeEnable) {
          this.changeMode('confirm');
        } else {
          this.changeMode('create');
        }
        break;
      case this.passcodeEditButton:
        this.changeMode('edit');
        break;
    }
  }
};

// startup
navigator.mozL10n.ready(PhoneLock.init.bind(PhoneLock));

