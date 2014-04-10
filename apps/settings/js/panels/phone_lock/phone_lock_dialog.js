/* global SettingsListener */
define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');
  var PhoneLockDialog = function ctor_phonelock_dialog() {
    return {
      panel: null,

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

      getAllElements: function() {
        this.passcodePanel = this.panel;
        this.passcodeInput = this.panel.querySelector('#passcode-input');
        this.passcodeDigits = this.panel.querySelectorAll('.passcode-digit');
        this.passcodeContainer =
          this.panel.querySelector('#passcode-container');
        this.createPasscodeButton =
          this.panel.querySelector('#passcode-create');
        this.changePasscodeButton =
          this.panel.querySelector('#passcode-change');
      },

      init: function() {
        this.getAllElements();
        this.passcodeInput.addEventListener('keypress', this);
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

      onInit: function(panel) {
        this.panel = panel;
        this.init();
      },

      onBeforeShow: function(panel, mode) {
        this.showDialogInMode(mode);
      },

      showDialogInMode: function(mode) {
        this.hideErrorMessage();
        this.MODE = mode;
        this.passcodePanel.dataset.mode = mode;
        this.passcodeInput.focus();
        this.updatePassCodeUI();
      },

      handleEvent: function(evt) {
        var settings;
        var passcode;
        var lock;

        switch (evt.target) {
          case this.passcodeInput:
            evt.preventDefault();
            if (this._passcodeBuffer === '') {
              this.hideErrorMessage();
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
                    this.resetPasscodeStatus();
                }
              }
            } else if (this._passcodeBuffer.length < 8) {
              this._passcodeBuffer += key;
            }

            this.updatePassCodeUI();

            if (this._passcodeBuffer.length ===
              this.checkingLength[this.MODE]) {
                switch (this.MODE) {
                  case 'create':
                  case 'new':
                    passcode = this._passcodeBuffer.substring(0, 4);
                    var passcodeToConfirm =
                      this._passcodeBuffer.substring(4, 8);
                    if (passcode != passcodeToConfirm) {
                      this._passcodeBuffer = '';
                      this.showErrorMessage();
                    } else {
                      this.enableButton();
                    }
                    break;
                  case 'confirm':
                    if (this.checkPasscode()) {
                      settings = navigator.mozSettings;
                      lock = settings.createLock();
                      lock.set({
                        'lockscreen.passcode-lock.enabled': false
                      });
                      this.backToPhoneLock();
                    } else {
                      this._passcodeBuffer = '';
                    }
                    break;
                  case 'confirmLock':
                    if (this.checkPasscode()) {
                      settings = navigator.mozSettings;
                      lock = settings.createLock();
                      lock.set({
                        'lockscreen.enabled': false
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
                      this.showDialogInMode('new');
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
            passcode = this._passcodeBuffer.substring(0, 4);
            settings = navigator.mozSettings;
            lock = settings.createLock();
            lock.set({
              'lockscreen.passcode-lock.code': passcode
            });
            lock.set({
              'lockscreen.passcode-lock.enabled': true
            });
            this.backToPhoneLock();
            break;
        }
      },

      fetchSettings: function() {
        SettingsListener.observe('lockscreen.passcode-lock.code', '0000',
          function(passcode) {
            this.settings.passcode = passcode;
        }.bind(this));
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
        SettingsService.navigate('phoneLock');
      }
    };
  };

  return PhoneLockDialog;
});
