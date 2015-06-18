/**
 * PassCode panel.
 * 
 * @module PassCodePanel
 * @return {Object}
 */
define([
  'panels',
  'shared/passcode_helper'
],

function(panels, PasscodeHelper) {
  'use strict';

  function PassCodePanel() {}

  PassCodePanel.prototype = {

    panel: null,

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

    init: function() {
      this.panel = document.getElementById('rp-passcode');
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

      this._fetchSettings();

      this.panel.addEventListener('pagerendered',
        this.onBeforeShow.bind(this));
    },

    /**
     * Re-runs the font-fit title
     * centering logic.
     *
     * The gaia-header has mutation observers
     * that listen for changes in the header
     * title and re-run the font-fit logic.
     *
     * If buttons around the title are shown/hidden
     * then these mutation observers won't be
     * triggered, but we want the font-fit logic
     * to be re-run.
     *
     * This is a deficiency of <gaia-header>. If
     * anyone knows a way to listen for changes
     * in visibility, we won't need this anymore.
     *
     * @param {GaiaHeader} header
     * @private
     */
    runHeaderFontFit: function su_runHeaderFontFit(header) {
      var titles = header.querySelectorAll('h1');
      [].forEach.call(titles, function(title) {
        title.textContent = title.textContent;
      });
    },

    _getAllElements: function sld_getAllElements() {
      this.passcodePanel = this.panel;
      this.header = this.panel.querySelector('header');
      this.passcodeInput = this.panel.querySelector('.passcode-input');
      this.passcodeDigits = this.panel.querySelectorAll('.passcode-digit');
      this.passcodeContainer =
        this.panel.querySelector('.passcode-container');
      this.createPasscodeButton =
        this.panel.querySelector('.passcode-create');
      this.changePasscodeButton =
        this.panel.querySelector('.passcode-change');
    },

    onBeforeShow: function sld_onBeforeShow(event) {
      this._showDialogInMode(event.detail || 'create');
      setTimeout(this.onShow.bind(this), 100);
    },

    onShow: function sld_onShow() {
      this.passcodeInput.focus();
    },

    _showDialogInMode: function sld_showDialogInMode(mode) {
      this._hideErrorMessage();
      this._MODE = mode;
      this.passcodePanel.dataset.mode = mode;
      this._updatePassCodeUI();
      this.runHeaderFontFit(this.header);
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
            'lockscreen.passcode-lock.enabled': true
          });
          PasscodeHelper.set(passcode).then(() => {
            this._backToScreenLock();
          });
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
            this._checkPasscode().then((result) => {
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
            this._checkPasscode().then((result) => {
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
            this._checkPasscode().then((result) => {
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

    _checkPasscode: function sld_checkPasscode() {
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
      panels.show({ id: 'rp-screenlock', back: true });
    }

  };

  return new PassCodePanel();

});
