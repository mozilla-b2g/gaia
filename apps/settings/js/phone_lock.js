/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var PhoneLock = {
  /**
   * create  : when the user turns on passcode settings
   * edit    : when the user presses edit passcode button
   * confirm : when the user turns off passcode settings
   * new     : when the user is editing passcode
   *                and has entered old passcode successfully
   */
  MODE: 'create',

  settings: {
    passcode: '0000',
    passcodeEnable: false,
    lockscreenEnable: false
  },

  checkingLength: {
    'create': 8,
    'new': 8,
    'edit': 4,
    'confirm': 4,
    'confirmLock': 4
  },

  _passcodeBuffer: '',

  getAllElements: function pl_getAllElements() {
    this.phonelockDesc = document.getElementById('phoneLock-desc');
    this.lockscreenEnable = document.getElementById('lockscreen-enable');
    this.passcodeInput = document.getElementById('passcode-input');
    this.passcodeContainer = document.getElementById('passcode-container');
    this.passcodeDigits = document.querySelectorAll('.passcode-digit');
    this.passcodeEnable = document.getElementById('passcode-enable');
    this.passcodeEditButton = document.getElementById('passcode-edit');
    this.passcodePanel = document.getElementById('phoneLock-passcode');
    this.phonelockPanel = document.getElementById('phoneLock');
    this.createPasscodeButton = document.getElementById('passcode-create');
    this.changePasscodeButton = document.getElementById('passcode-change');
  },

  init: function pl_init() {
    this.getAllElements();
    this.passcodeEnable.addEventListener('click', this);
    this.lockscreenEnable.addEventListener('click', this);
    this.passcodeInput.addEventListener('keypress', this);
    this.passcodeEditButton.addEventListener('click', this);
    this.createPasscodeButton.addEventListener('click', this);
    this.changePasscodeButton.addEventListener('click', this);

    // If the pseudo-input loses focus, then allow the user to restore focus
    // by touching the container around the pseudo-input.
    var self = this;
    this.passcodeContainer.addEventListener('click', function(evt) {
      self.passcodeInput.focus();
      evt.preventDefault();
    });

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
      self.toggleLock(enable);
    };

    var reqCode = lock.get('lockscreen.passcode-lock.code');
    reqCode.onsuccess = function onPasscodeSuccess() {
      var passcode = reqCode.result['lockscreen.passcode-lock.code'];
      self.settings.passcode = passcode;
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
        self.toggleLock(enable);
    });

    settings.addObserver('lockscreen.passcode-lock.enabled',
      function onPasscodeLockEnableChange(event) {
        self.settings.passcodeEnable = event.settingValue;
        self.phonelockPanel.dataset.passcodeEnabled = event.settingValue;
        self.passcodeEnable.checked = event.settingValue;
    });

    settings.addObserver('lockscreen.passcode-lock.code',
      function onPasscodeLockCodeChange(event) {
        self.settings.passcode = event.settingValue;
    });

  },

  toggleLock: function pl_toggleLock(enable) {
    this.settings.lockscreenEnable = enable;
    var _ = navigator.mozL10n.get;
    this.phonelockPanel.dataset.lockscreenEnabled = enable;
    this.phonelockDesc.textContent = enable ? _('enabled') : _('disabled');
    this.phonelockDesc.dataset.l10nId = enable ? 'enabled' : 'disabled';
    this.lockscreenEnable.checked = enable;
  },

  showErrorMessage: function pl_showErrorMessage(message) {
    this.passcodePanel.dataset.passcodeStatus = 'error';
  },

  hideErrorMessage: function pl_hideErrorMessage() {
    this.passcodePanel.dataset.passcodeStatus = '';
  },

  resetPasscodeStatus: function pl_resetPasscodeStatus() {
    this.passcodePanel.dataset.passcodeStatus = '';
  },

  enableButton: function pl_enableButton() {
    this.passcodePanel.dataset.passcodeStatus = 'success';
  },

  changeMode: function pl_changeMode(mode) {
    this.hideErrorMessage();
    this.MODE = mode;
    this.passcodePanel.dataset.mode = mode;
    if (Settings.currentPanel != '#phoneLock-passcode') {
      Settings.currentPanel = '#phoneLock-passcode'; // show dialog box

      // Open the keyboard after the UI transition. We can't listen for the
      // ontransitionend event because some of the passcode mode changes, such
      // as edit->new, do not trigger transition events.
      setTimeout(function(self) { self.passcodeInput.focus(); }, 0, this);
    }
    this.updatePassCodeUI();
  },

  handleEvent: function pl_handleEvent(evt) {
    switch (evt.target) {
      case this.passcodeEnable:
        evt.preventDefault();
        this._passcodeBuffer = '';
        if (this.settings.passcodeEnable) {
          this.changeMode('confirm');
        } else {
          this.changeMode('create');
        }
        break;
      case this.lockscreenEnable:
        this._passcodeBuffer = '';
        if (this.settings.lockscreenEnable == true &&
          this.settings.passcodeEnable == true) {
          evt.preventDefault();
          this.changeMode('confirmLock');
        }
        break;
      case this.passcodeInput:
        evt.preventDefault();
        if (this._passcodeBuffer === '')
          this.hideErrorMessage();

        var code = evt.charCode;
        if (code !== 0 && (code < 0x30 || code > 0x39))
          return;

        var key = String.fromCharCode(code);
        if (evt.charCode === 0) {
          if (this._passcodeBuffer.length > 0) {
            this._passcodeBuffer = this._passcodeBuffer.substring(0,
                this._passcodeBuffer.length - 1);
            if (this.passcodePanel.dataset.passcodeStatus == 'success') {
                this.resetPasscodeStatus();
            }
          }
        } else if (this._passcodeBuffer.length < 8) {
          this._passcodeBuffer += key;
        }

        this.updatePassCodeUI();

        if (this._passcodeBuffer.length == this.checkingLength[this.MODE]) {
          switch (this.MODE) {
            case 'create':
            case 'new':
              var passcode = this._passcodeBuffer.substring(0, 4);
              var passcodeToConfirm = this._passcodeBuffer.substring(4, 8);
              if (passcode != passcodeToConfirm) {
                this._passcodeBuffer = '';
                this.showErrorMessage();
              } else {
                this.enableButton();
              }
              break;
            case 'confirm':
              if (this.checkPasscode()) {
                var settings = navigator.mozSettings;
                var lock = settings.createLock();
                var reqSetPasscode = lock.set({
                  'lockscreen.passcode-lock.enabled': false
                });
                this.backToPhoneLock();
              } else {
                this._passcodeBuffer = '';
              }
              break;
            case 'confirmLock':
              if (this.checkPasscode()) {
                var settings = navigator.mozSettings;
                var lock = settings.createLock();
                var reqSetPasscode = lock.set({
                  'lockscreen.enabled': false
                });
                this.backToPhoneLock();
              } else {
                this._passcodeBuffer = '';
                this.toggleLock(true);
              }
              break;
            case 'edit':
              if (this.checkPasscode()) {
                this._passcodeBuffer = '';
                this.updatePassCodeUI();
                this.changeMode('new');
              } else {
                this._passcodeBuffer = '';
              }
              break;
          }
        }
        break;
      case this.passcodeEditButton:
        this._passcodeBuffer = '';
        this.changeMode('edit');
        break;
      case this.createPasscodeButton:
      case this.changePasscodeButton:
        evt.stopPropagation();
        if (this.passcodePanel.dataset.passcodeStatus !== 'success') {
          this.showErrorMessage();
          this.passcodeInput.focus();
          return;
        }

        var passcode = this._passcodeBuffer.substring(0, 4);
        var settings = navigator.mozSettings;
        var lock = settings.createLock();
        var reqSetPasscode = lock.set({
          'lockscreen.passcode-lock.code': passcode
        });
        var reqSetPasscodeEnable = lock.set({
          'lockscreen.passcode-lock.enabled': true
        });
        this.backToPhoneLock();
        break;
    }
  },

  updatePassCodeUI: function pl_updatePassCodeUI() {
    for (var i = 0; i < 8; i++) {
      if (i < this._passcodeBuffer.length) {
        this.passcodeDigits[i].dataset.dot = true;
      } else {
        delete this.passcodeDigits[i].dataset.dot;
      }
    }
  },

  checkPasscode: function pl_checkPasscode() {
    if (this.settings.passcode != this._passcodeBuffer) {
      this.showErrorMessage();
      return false;
    } else {
      this.hideErrorMessage();
      return true;
    }
  },

  backToPhoneLock: function pl_backToPhoneLock() {
    this._passcodeBuffer = '';
    this.passcodeInput.blur();
    Settings.currentPanel = '#phoneLock';
  }
};

// startup
navigator.mozL10n.ready(PhoneLock.init.bind(PhoneLock));

