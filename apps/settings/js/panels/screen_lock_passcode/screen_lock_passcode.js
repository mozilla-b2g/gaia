define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');
  var SettingsUtils = require('modules/settings_utils');
  var PasscodeHelper = require('shared/passcode_helper');

  var ScreenLockPasscode = function ctor_screenlock_passcode() {
    return {
      _panel: null,

      /**
       * create  : when the user turns on passcode settings
       * edit    : when the user presses edit passcode button
       * confirm : when the user turns off passcode settings
       * new     : when the user is editing passcode
       *                and has entered old passcode successfully
       */
      _MODE: 'create',

      _checkingLength: {
        'create': 8,
        'new': 8,
        'edit': 4,
        'confirm': 4,
        'confirmLock': 4
      },

      _leftApp: false,

      _passcodeBuffer: '',

      _getAllElements: function sld_getAllElements() {
        this.passcodePanel = this._panel;
        this.header = this._panel.querySelector('gaia-header');
        this.passcodeInput = this._panel.querySelector('.passcode-input');
        this.passcodeDigits = this._panel.querySelectorAll('.passcode-digit');
        this.passcodeContainer =
          this._panel.querySelector('.passcode-container');
        this.createPasscodeButton =
          this._panel.querySelector('.passcode-create');
        this.changePasscodeButton =
          this._panel.querySelector('.passcode-change');
      },

      init: function sld_onInit() {
        this._getAllElements();
        this.passcodeInput.addEventListener('keypress', this);
        this.createPasscodeButton.addEventListener('click', this);
        this.changePasscodeButton.addEventListener('click', this);

        // If the pseudo-input loses focus, then allow the user to restore focus
        // by touching the container around the pseudo-input.
        this.passcodeContainer.addEventListener('click', function(evt) {
          this.passcodeInput.focus();
          evt.preventDefault();
        }.bind(this));
      },

      onInit: function sld_onInit(panel) {
        this._panel = panel;
        this.init();
      },

      onBeforeShow: function sld_onBeforeShow(panel, mode) {
        if (!this._leftApp) {
          this._showDialogInMode(mode);
        }
        this._leftApp = false;
      },

      onShow: function sld_onShow() {
        this.passcodeInput.focus();
      },

      onHide: function sld_onBeforeHide() {
        this._leftApp = document.hidden;

        if (!this._leftApp) {
          this._passcodeBuffer = '';
          this._updatePassCodeUI();
        }
      },

      _showDialogInMode: function sld_showDialogInMode(mode) {
        this._hideErrorMessage();
        this._MODE = mode;
        this.passcodePanel.dataset.mode = mode;
        this._updatePassCodeUI();
        SettingsUtils.runHeaderFontFit(this.header);
      },

      handleEvent: function sld_handleEvent(evt) {
        var settings;
        var passcode;
        var lock;

        switch (evt.target) {
          case this.passcodeInput:
            // key code for key strokes from the keypad are 0 (numbers) and 8
            // (backspace). Filter out the events that are not from the keypad.
            var keyCode = evt.keyCode;
            if (keyCode !== 0 && keyCode !== 8) {
              return Promise.resolve();
            }

            evt.preventDefault();
            if (this._passcodeBuffer === '') {
              this._hideErrorMessage();
            }

            var code = evt.charCode;
            if (code !== 0 && (code < 0x30 || code > 0x39)) {
              return Promise.resolve();
            }

            var key = String.fromCharCode(code);
            if (evt.charCode === 0) {
              if (this._passcodeBuffer.length > 0) {
                this._passcodeBuffer = this._passcodeBuffer.substring(0,
                  this._passcodeBuffer.length - 1);
                if (this.passcodePanel.dataset.passcodeStatus === 'success') {
                  this._resetPasscodeStatus();
                }
              }
            } else if (this._passcodeBuffer.length < 8) {
              this._passcodeBuffer += key;
            }

            this._updatePassCodeUI();
            return this._enablePasscode();
          case this.createPasscodeButton:
          case this.changePasscodeButton:
            evt.stopPropagation();
            if (this.passcodePanel.dataset.passcodeStatus !== 'success') {
              this._showErrorMessage();
              this.passcodeInput.focus();
              return Promise.resolve();
            }
            passcode = this._passcodeBuffer.substring(0, 4);
            settings = navigator.mozSettings;
            lock = settings.createLock();
            return lock.set({
              'lockscreen.passcode-lock.enabled': true
            }).then(() => {
              return PasscodeHelper.set(passcode);
            }).then(() => {
              this._backToScreenLock();
            }).catch((e) => {
              this._showErrorMessage();
            });
        }
        return Promise.resolve();
      },

      _enablePasscode: function sld_enablePasscode() {
        var settings;
        var passcode;
        var lock;
        var check = Promise.resolve();

        if (this._passcodeBuffer.length === this._checkingLength[this._MODE]) {
          switch (this._MODE) {
            case 'create':
            case 'new':
              passcode = this._passcodeBuffer.substring(0, 4);
              var passcodeToConfirm = this._passcodeBuffer.substring(4, 8);
              if (passcode != passcodeToConfirm) {
                this._passcodeBuffer = '';
                this._showErrorMessage();
              } else {
                this._enableButton();
              }
              break;
            case 'confirm':
              check = this._checkPasscode().then((result) => {
                if (result) {
                  settings = navigator.mozSettings;
                  lock = settings.createLock();
                  lock.set({
                    'lockscreen.passcode-lock.enabled': false
                  });
                  this._backToScreenLock();
                } else {
                  this._passcodeBuffer = '';
                }
              });
              break;
            case 'confirmLock':
              check = this._checkPasscode();
              check = check.then((result) => {
                if (result) {
                  settings = navigator.mozSettings;
                  lock = settings.createLock();
                  lock.set({
                    'lockscreen.enabled': false,
                    'lockscreen.passcode-lock.enabled': false
                  });
                  this._backToScreenLock();
                } else {
                  this._passcodeBuffer = '';
                }
              });
              break;
            case 'edit':
              check = this._checkPasscode().then((result) => {
                if (result) {
                  this._passcodeBuffer = '';
                  this._updatePassCodeUI();
                  this._showDialogInMode('new');
                } else {
                  this._passcodeBuffer = '';
                }
              });
              break;
          }
        }
        return check;
      },

      _showErrorMessage: function sld_showErrorMessage(message) {
        this.passcodePanel.dataset.passcodeStatus = 'error';
      },

      _hideErrorMessage: function sld_hideErrorMessage() {
        this.passcodePanel.dataset.passcodeStatus = '';
      },

      _resetPasscodeStatus: function sld_resetPasscodeStatus() {
        this.passcodePanel.dataset.passcodeStatus = '';
      },

      _enableButton: function sld_enableButton() {
        this.passcodePanel.dataset.passcodeStatus = 'success';
      },

      _updatePassCodeUI: function sld_updatePassCodeUI() {
        for (var i = 0; i < 8; i++) {
          if (i < this._passcodeBuffer.length) {
            this.passcodeDigits[i].dataset.dot = true;
          } else {
            delete this.passcodeDigits[i].dataset.dot;
          }
        }
      },

      _checkPasscode: function sld_checkPasscodee() {
        return PasscodeHelper.check(this._passcodeBuffer).then((result) => {
          if (result) {
            this._hideErrorMessage();
          } else {
            this._showErrorMessage();
          }
          return result;
        }).catch(() => {
          this._showErrorMessage();
        });
      },

      _backToScreenLock: function sld_backToScreenLock() {
        this._passcodeBuffer = '';
        this.passcodeInput.blur();
        SettingsService.navigate('screenLock');
      }
    };
  };

  return ScreenLockPasscode;
});
