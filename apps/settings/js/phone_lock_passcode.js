/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var PhoneLockPasscode = {
  /**
   * create  : when the user turns on passcode settings
   * edit    : when the user presses edit passcode button
   * confirm : when the user turns off passcode settings
   * new     : when the user is editing passcode
   *                and has entered old passcode successfully
   */
  MODE: sheet.args.mode || 'create',

  settings: {
    passcode: '0000'
  },

  checkingLength: {
    'create': 8,
    'new': 8,
    'edit': 4,
    'confirm': 4
  },

  _passcodeBuffer: '',

  getAllElements: function pl_getAllElements() {
    this.backButton = document.getElementById('close-sheet');
    this.passcodeInput = document.getElementById('passcode-input');
    this.passcodeContainer = document.getElementById('passcode-container');
    this.passcodeDigits = document.querySelectorAll('.passcode-digit');
    this.passcodePanel = document.getElementById('phoneLock-passcode');
    this.createPasscodeButton = document.getElementById('passcode-create');
    this.changePasscodeButton = document.getElementById('passcode-change');
  },

  init: function pl_init() {
    this.getAllElements();

    this.changeMode();

    this.passcodeInput.addEventListener('keypress', this);
    this.createPasscodeButton.addEventListener('click', this);
    this.changePasscodeButton.addEventListener('click', this);
    this.backButton.addEventListener('click', sheet.close);

    // If the pseudo-input loses focus, then allow the user to restore focus
    // by touching the container around the pseudo-input.
    var self = this;
    this.passcodeContainer.addEventListener('click', function(evt) {
      self.passcodeInput.focus();
      evt.preventDefault();
    });

    this.passcodeInput.focus();

    this.fetchSettings();
  },

  fetchSettings: function pl_fetchSettings() {
    var _ = navigator.mozL10n.get;
    var settings = navigator.mozSettings;

    var lock = settings.createLock();
    var self = this;

    var reqCode = lock.get('lockscreen.passcode-lock.code');
    reqCode.onsuccess = function onPasscodeSuccess() {
      var passcode = reqCode.result['lockscreen.passcode-lock.code'];
      self.settings.passcode = passcode;
    };

    settings.addObserver('lockscreen.passcode-lock.code',
      function onPasscodeLockCodeChange(event) {
        self.settings.passcode = event.settingValue;
    });
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

  changeMode: function pl_changeMode(newMode) {
    if (newMode) {
      this.MODE = newMode;
    }
    this.passcodePanel.dataset.mode = this.MODE;
  },

  handleEvent: function pl_handleEvent(evt) {
    switch (evt.target) {
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
                reqSetPasscode.onsuccess = this.backToPhoneLock.bind(this);
              } else {
                this._passcodeBuffer = '';
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
      case this.createPasscodeButton:
      case this.changePasscodeButton:
        evt.stopPropagation();
        if (this.passcodePanel.dataset.passcodeStatus !== 'success') {
          this.showErrorMessage();
          this.passcodeInput.focus();
          return;
        }

        var pending = 2;
        var next = (function() {
          if (!(--pending)) {
            this.backToPhoneLock();
          }
        }).bind(this);

        var passcode = this._passcodeBuffer.substring(0, 4);
        var settings = navigator.mozSettings;

        var lock = settings.createLock();
        var reqSetPasscode = lock.set({
          'lockscreen.passcode-lock.code': passcode
        });
        reqSetPasscode.onsuccess = next;
        var reqSetPasscodeEnable = lock.set({
          'lockscreen.passcode-lock.enabled': true
        });
        reqSetPasscodeEnable.onsuccess = next;
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
    sheet.close();
  }
};

// startup
navigator.mozL10n.ready(PhoneLockPasscode.init.bind(PhoneLockPasscode));

