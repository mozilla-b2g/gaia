/* global SettingsListener */
define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');

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

      _settings: {
        passcode: '0000'
      },

      _checkingLength: {
        'create': 8,
        'new': 8,
        'edit': 4,
        'confirm': 4,
        'confirmLock': 4
      },

      _passcodeBuffer: '',

      _getAllElements: function sld_getAllElements() {
        this.passcodePanel = this._panel;
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

        this._disablePasscodeButtons(true);

        // If the pseudo-input loses focus, then allow the user to restore focus
        // by touching the container around the pseudo-input.
        this.passcodeContainer.addEventListener('click', function(evt) {
          this.passcodeInput.focus();
          evt.preventDefault();
        }.bind(this));

        this._fetchSettings();
      },

      onInit: function sld_onInit(panel) {
        this._panel = panel;
        this.init();
      },

      onBeforeShow: function sld_onBeforeShow(panel, mode) {
        this._showDialogInMode(mode);
      },

      onShow: function sld_onShow() {
        this.passcodeInput.focus();
      },

      _showDialogInMode: function sld_showDialogInMode(mode) {
        this._hideErrorMessage();
        this._MODE = mode;
        this.passcodePanel.dataset.mode = mode;
        this._updatePassCodeUI();
      },

      handleEvent: function sld_handleEvent(evt) {
        var settings;
        var passcode;
        var lock;

        switch (evt.target) {
          case this.passcodeInput:
            evt.preventDefault();
            if (this._passcodeBuffer === '') {
              this._hideErrorMessage();
            }
            var code = evt.charCode;

            if (code !== 0 && (code < 0x30 || code > 0x39)) {
              return;
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
            this._enablePasscode();
            break;
          case this.createPasscodeButton:
          case this.changePasscodeButton:
            evt.stopPropagation();
            if (this.passcodePanel.dataset.passcodeStatus !== 'success') {
              this._showErrorMessage();
              this.passcodeInput.focus();
              return;
            }
            passcode = this._passcodeBuffer.substring(0, 4);
            settings = navigator.mozSettings;
            lock = settings.createLock();
            lock.set({
              'lockscreen.passcode-lock.code': passcode
            });
            lock.set({
              'lockscreen.passcode-lock.enabled': true
            });
            this._backToScreenLock();
            break;
        }
      },

      _enablePasscode: function sld_enablePasscode() {
        var settings;
        var passcode;
        var lock;

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
              if (this._checkPasscode()) {
                settings = navigator.mozSettings;
                lock = settings.createLock();
                lock.set({
                  'lockscreen.passcode-lock.enabled': false
                });
                this._backToScreenLock();
              } else {
                this._passcodeBuffer = '';
              }
              break;
            case 'confirmLock':
              if (this._checkPasscode()) {
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
              break;
            case 'edit':
              if (this._checkPasscode()) {
                this._passcodeBuffer = '';
                this._updatePassCodeUI();
                this._showDialogInMode('new');
              } else {
                this._passcodeBuffer = '';
              }
              break;
          }

          // We're appending new elements to DOM so to make sure headers are
          // properly resized and centered, we emmit a lazyload event.
          // This will be removed when the gaia-header web component lands.
          window.dispatchEvent(new CustomEvent('lazyload', {
            detail: this._panel
          }));
        }
      },

      _fetchSettings: function sld_fetchSettings() {
        SettingsListener.observe('lockscreen.passcode-lock.code', '0000',
          function(passcode) {
            this._settings.passcode = passcode;
        }.bind(this));
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
        if (this._passcodeBuffer.length !== 8) {
          this._disablePasscodeButtons(true);
        } else {
          this._disablePasscodeButtons(false);
        }
      },

      _disablePasscodeButtons: function sld__disablePasscodeButtons(value) {
        this.createPasscodeButton.disabled = value;
        this.changePasscodeButton.disabled = value;
      },

      _checkPasscode: function sld_checkPasscode() {
        if (this._settings.passcode != this._passcodeBuffer) {
          this._showErrorMessage();
          return false;
        } else {
          this._hideErrorMessage();
          return true;
        }
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
