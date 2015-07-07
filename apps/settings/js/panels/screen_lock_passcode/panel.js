define(function(require) {
  'use strict';

  var SettingsUtils = require('modules/settings_utils');
  var SettingsListener = require('shared/settings_listener');
  var DialogPanel = require('modules/dialog_panel');

  return function ctor_screenlockPasscode() {
    var mozSettings = window.navigator.mozSettings;

    return DialogPanel({
      _elements: {},
      
      /**
       * create  : when the user turns on passcode settings
       * edit    : when the user presses edit passcode button
       * confirm : when the user turns off passcode settings
       * new     : when the user is editing passcode
       *                and has entered old passcode successfully
       */
      _mode: 'create',

      _leftApp: false,

      _passcodeBuffer: '',

      _passcodeInSettings: '0000',

      _checkingLength: {
        'create': 8,
        'new': 8,
        'edit': 4,
        'confirm': 4,
        'confirmLock': 4
      },

      _headerL10nIdMapping: {
        'create': 'new-passcode',
        'edit': 'current-passcode',
        'new': 'new-passcode',
        'confirm': 'enter-passcode',
        'confirmLock': 'enter-passcode'
      },

      _submitButtonL10nIdMapping: {
        'new': 'change',
        'create': 'create',
        'edit': '', // we have to hide button in this case
        'confirm': '', // we have to hide button in this case
        'confirmLock': '' // we have to hide button in this case
      },

      onInit: function(panel) {
        this._elements.panel = panel;
        this._elements.gaiaHeader = panel.querySelector('gaia-header');
        this._elements.header = panel.querySelector('gaia-header h1');
        this._elements.passcodeInput = panel.querySelector('.passcode-input');
        this._elements.passcodeDigits =
          panel.querySelectorAll('.passcode-digit');
        this._elements.passcodeContainer =
          panel.querySelector('.passcode-container');
        this._elements.submitButton =
          panel.querySelector('button[type="submit"]');
        this._elements.submitButtonText =
          this._elements.submitButton.querySelector('span');

        this._bindEvents();
      },

      _bindEvents: function() {
        this._elements.passcodeInput.onkeypress =
          this._onPasscodeInputKeypress.bind(this);
        this._elements.passcodeContainer.onclick =
          this._onPasscodeContainerClick.bind(this);

        this._observePasscodeChange();
      },

      _observePasscodeChange: function() {
        SettingsListener.observe(
          'lockscreen.passcode-lock.code', '0000', (newPasscode) => {
            this._passcodeInSettings = newPasscode;
        });
      },

      _onPasscodeContainerClick: function(evt) {
        evt.preventDefault();
        this._elements.passcodeInput.focus();
      },

      _onPasscodeInputKeypress: function(evt) {
        // key code for key strokes from the keypad are 0 (numbers) and 8
        // (backspace). Filter out the events that are not from the keypad.
        var keyCode = evt.keyCode;
        if (keyCode !== 0 && keyCode !== 8) {
          return;
        }

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
            this._passcodeBuffer = this._getPasscodeBuffer('all');
            if (this._elements.panel.dataset.passcodeStatus === 'success') {
              this._resetPasscodeStatus();
            }
          }
        } else if (this._passcodeBuffer.length < 8) {
          this._passcodeBuffer += key;
        }

        this._updatePassCodeUI();
        this._processPasscode();
      },

      _updateHeaderAndButtonUI: function() {
        var headerL10nId = this._headerL10nIdMapping[this._mode];
        var buttonL10nId = this._submitButtonL10nIdMapping[this._mode];

        if (headerL10nId) {
          this._elements.header.setAttribute('data-l10n-id', headerL10nId);
        }

        if (buttonL10nId === '') {
          this._elements.submitButton.disabled = true;
          this._elements.submitButtonText.removeAttribute('data-l10n-id');
          this._elements.submitButtonText.textContent = '';
        } else if (buttonL10nId) {
          this._elements.submitButton.disabled = false;
          this._elements.submitButtonText.setAttribute('data-l10n-id',
            buttonL10nId);
        }

        SettingsUtils.runHeaderFontFit(this._elements.gaiaHeader);
      },

      _updatePassCodeUI: function() {
        for (var i = 0; i < 8; i++) {
          if (i < this._passcodeBuffer.length) {
            this._elements.passcodeDigits[i].dataset.dot = true;
          } else {
            delete this._elements.passcodeDigits[i].dataset.dot;
          }
        }
      },

      _processPasscode: function() {
        if (this._passcodeBuffer.length === this._checkingLength[this._mode]) {
          switch (this._mode) {
            case 'create':
            case 'new':
              var originalPasscode = this._getPasscodeBuffer('original');
              var confirmPasscode = this._getPasscodeBuffer('confirm');
              if (originalPasscode !== confirmPasscode) {
                this._passcodeBuffer = '';
                this._showErrorMessage();
              } else {
                this._showSuccessPasscodeStatus();
              }
              break;
            case 'confirm':
              if (this._checkPasscode()) {
                mozSettings.createLock().set({
                  'lockscreen.passcode-lock.enabled': false
                }).then(() => {
                  this._showSuccessPasscodeStatus();
                  this.cancel(); // programmatically close the dialog
                }).catch((error) => {
                  console.log(error);
                });
              } else {
                this._passcodeBuffer = '';
              }
              break;
            case 'confirmLock':
              if (this._checkPasscode()) {
                mozSettings.createLock().set({
                  'lockscreen.enabled': false,
                  'lockscreen.passcode-lock.enabled': false
                }).then(() => {
                  this._showSuccessPasscodeStatus();
                  this.cancel(); // programmatically close the dialog
                }).catch((error) => {
                  console.log(error);
                });
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
        }
      },

      _showDialogInMode: function(mode) {
        this._mode = mode;
        this._elements.panel.dataset.mode = mode;

        this._hideErrorMessage();
        this._updatePassCodeUI();
        this._updateHeaderAndButtonUI();
      },

      onSubmit: function() {
        if (this._elements.panel.dataset.passcodeStatus !== 'success') {
          this._showErrorMessage();
          this._elements.passcodeInput.focus();
          return Promise.reject();
        } else {
          var originalPasscode = this._getPasscodeBuffer('original');
          // [Note]
          // 
          // We keep this onSubmit function for the scenario when users did
          // type the password correctly and click "Submit" button to `submit`
          // this dialog.
          return mozSettings.createLock().set({
            'lockscreen.passcode-lock.code': originalPasscode,
            'lockscreen.passcode-lock.enabled': true
          });
        }
      },

      onCancel: function() {
        // [Note]
        // 
        // While for the `confirm` & `confirmLock` case, because from UX spec,
        // there is no need to click the submit button, we have to close
        // the dialog programmatically, so we will use `this.cancel()` to
        // close the dialog.
        this._elements.passcodeInput.blur();
      },

      onBeforeShow: function(panel, options) {
        this._mode = options.mode;
        if (!this._leftApp) {
          this._showDialogInMode(this._mode);
        }
        this._leftApp = false;
      },

      onShow: function() {
        this._elements.passcodeInput.focus();
      },

      onHide: function() {
        this._leftApp = document.hidden;
        // If users did type some passcode before, when leaving the app by
        // home key, we should not clean passcodeBuffer at this moment.
        //
        // Otherwise, the UI will be inconsistent with its internal state
        if (!this._leftApp) {
          this._passcodeBuffer = '';
        }
      },

      _checkPasscode: function() {
        if (this._passcodeInSettings !== this._passcodeBuffer) {
          this._showErrorMessage();
          return false;
        } else {
          this._hideErrorMessage();
          return true;
        }
      },

      _showErrorMessage: function() {
        this._elements.panel.dataset.passcodeStatus = 'error';
      },

      _hideErrorMessage: function() {
        this._elements.panel.dataset.passcodeStatus = '';
      },

      _resetPasscodeStatus: function() {
        this._elements.panel.dataset.passcodeStatus = '';
      },

      _showSuccessPasscodeStatus: function() {
        this._elements.panel.dataset.passcodeStatus = 'success';
      },

      _getPasscodeBuffer: function(part) {
        if (part === 'original') {
          return this._passcodeBuffer.substring(0, 4);
        } else if (part === 'confirm'){
          return this._passcodeBuffer.substring(4, 8);
        } else if (part === 'all') {
          return this._passcodeBuffer.substring(0,
            this._passcodeBuffer.length - 1);
        } else {
          console.log('You are using _getPasscodeBuffer wrongly, ' +
            'please check your argument again - ' + part);
        }
      }
    });
  };
});
