/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var PhoneLock = {
  // create:  When the user turns on passcode settings
  // edit:    When the user presses edit passcode button
  // confirm: When the user turns off passcode settings
  // new:     When the user is editing passcode and enterer old
  //          passcode successfully
  MODE: 'create',

  settings: {
    passcode: '0000',
    enable: false
  },

  checkingLength: {
    'create': 8,
    'new': 8,
    'edit': 4,
    'confirm': 4
  },

  _passcodeBuffer: '',

  getAllElements: function pl_getAllElements() {
    this.passcodeInput = document.getElementById('passcode-input');
    this.passcodeDigits = document.querySelectorAll('.passcode-digit');
    this.passcodeEnable = document.getElementById('passcode-enable');
    this.passcodeEditButton = document.getElementById('passcode-edit');
    this.passcodePanel = document.getElementById('passcode-panel');
    this.phonelockPanel = document.getElementById('phoneLock');
    this.createPasscodeButton = document.getElementById('passcode-create');
    this.changePasscodeButton = document.getElementById('passcode-change');
  },

  init: function pl_init() {
    this.getAllElements();
    this.passcodeEnable.addEventListener('click', this);
    this.passcodeInput.addEventListener('keypress', this);
    this.passcodeEditButton.addEventListener('click', this);
    this.createPasscodeButton.addEventListener('click', this);
    this.changePasscodeButton.addEventListener('click', this);
    this.passcodePanel.addEventListener('click', this);
    this.fetchSettings();
  },

  fetchSettings: function pl_fetchSettings() {
    var settings = navigator.mozSettings;

    var lock = settings.createLock();
    var reqCode = lock.get('lockscreen.passcode-lock.code');
    var self = this;
    reqCode.onsuccess = function onPasscodeSuccess() {
      var passcode = reqCode.result['lockscreen.passcode-lock.code'];
      self.settings.passcode = passcode;
    };
    var reqEnable = lock.get('lockscreen.passcode-lock.enabled');
    reqEnable.onsuccess = function onPasscodeEnableSuccess() {
      var enable = reqEnable.result['lockscreen.passcode-lock.enabled'];
      self.settings.enable = enable;
      self.phonelockPanel.dataset.enabled = enable;
    };

    settings.addObserver('lockscreen.passcode-lock.enabled',
      function onLockscreenEnableChange(event) {
        self.settings.enable = event.settingValue;
        self.phonelockPanel.dataset.enabled = event.settingValue;
    });

    settings.addObserver('lockscreen.passcode-lock.code',
      function onLockscreenCodeChange(event) {
        self.settings.passcode = event.settingValue;
    });
  },

  showErrorMessage: function pl_showErrorMessage(message) {
    this.passcodePanel.dataset.passcodeStatus = 'error';
  },

  hideErrorMessage: function pl_hideErrorMessage() {
    this.passcodePanel.dataset.passcodeStatus = '';
  },

  enableButton: function pl_enableButton() {
    this.passcodePanel.dataset.passcodeStatus = 'success';
  },

  changeMode: function pl_changeMode(mode) {
    this.hideErrorMessage();
    this.MODE = mode;
    this.passcodePanel.dataset.mode = mode;
    document.location.hash = 'passcode-panel'; // show dialog box
    this.passcodeInput.focus();
    this.updatePassCodeUI();
  },

  handleEvent: function pl_handleEvent(evt) {
    switch (evt.target) {
      case this.passcodeEnable:
        evt.preventDefault();
        if (this.settings.enable) {
          this.changeMode('confirm');
        } else {
          this.changeMode('create');
        }
        break;
      case this.passcodeInput:
        evt.preventDefault();
        if (this._passcodeBuffer === '')
          this.hideErrorMessage();

        var key = String.fromCharCode(evt.charCode);
        if (evt.charCode === 0) {
          if (this._passcodeBuffer.length > 0) {
            this._passcodeBuffer =
              this._passcodeBuffer.substring(0, this._passcodeBuffer.length - 1);
          }
        } else {
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
        this.changeMode('edit');
        break;
      case this.passcodePanel:
        this.passcodeInput.focus();
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
    document.location.hash = 'phoneLock';
  }
};

PhoneLock.init();

