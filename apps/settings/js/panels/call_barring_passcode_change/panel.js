/* global DsdsSettings */

define(function(require) {
  'use strict';

  var SettingsService = require('modules/settings_service');
  var SettingsPanel = require('modules/settings_panel');
  var ChangePasscodeScreen =
    require('panels/call_barring_passcode_change/call_barring_passcode_change');

  return function ctor_call_barring_passcode_change() {
    var passcodeChange = ChangePasscodeScreen();

    var _mobileConnection,
        _voiceServiceClassMask;

    var _passcodePanel,
        _passcodeHeader,
        _passcodeInput,
        _passcodeError,
        _passcodeDigits,
        _passcodeContainer,
        _changePasscodeButton;

    var _MODE;
    var _settings = {
      pin: '',
      newPin: ''
    };
    var _passcodeBuffer = '';
    var _checkingLength = {
      'new': 8,
      'edit': 4
    };

    function _changeMode(mode) {
      _passcodePanel.dataset.mode = _MODE = mode;
      _hideErrorMessage();
    }

    function _getInputKey(evt) {
      if (_passcodeBuffer === '') {
        _hideErrorMessage();
      }

      var code = evt.charCode;
      if (code !== 0 && (code < 0x30 || code > 0x39)) {
        return;
      }

      var key = String.fromCharCode(code);
      if (code === 0) { // delete
        if (_passcodeBuffer.length > 0) {
          _passcodeBuffer = _passcodeBuffer.substring(0,
            _passcodeBuffer.length - 1);
          if (_passcodePanel.dataset.passcodeStatus === 'success') {
            _resetPasscodeStatus();
          }
        }
      } else if (_passcodeBuffer.length < 8) {
        _passcodeBuffer += key;
      }

      _updatePasscodeUI();
      _enablePasscode();
    }

    function _enablePasscode() {
      if (_passcodeBuffer.length === _checkingLength[_MODE]) {
        switch (_MODE) {
          case 'edit':
            if (_checkPasscode()) {
              _passcodeBuffer = '';
              _updatePasscodeUI();
              _changeMode('new');
            } else {
              _passcodeBuffer = '';
            }
            break;
          case 'new':
            var passcode = _passcodeBuffer.substring(0, 4);
            var passcodeToConfirm = _passcodeBuffer.substring(4, 8);
            if (passcode === passcodeToConfirm) {
              _settings.newPin = passcode;
              _enableButton();
            } else {
              _passcodeBuffer = '';
              _showErrorMessage('mismatch');
            }
            break;
        }
      }
    }

    function _showErrorMessage(type) {
      _passcodePanel.dataset.passcodeStatus = 'error';
      var tag = 'callBarring-passcode-error-' + type || 'generic';
      document.l10n.setAttributes(_passcodeError, tag);
    }

    function _hideErrorMessage() {
      _passcodePanel.dataset.passcodeStatus = '';
    }

    function _resetPasscodeStatus() {
      _passcodePanel.dataset.passcodeStatus = '';
    }

    function _enableButton() {
      _passcodePanel.dataset.passcodeStatus = 'success';
    }

    function _updatePasscodeUI() {
      for (var i = 0; i < 8; i++) {
        if (i < _passcodeBuffer.length) {
          _passcodeDigits[i].dataset.dot = true;
        } else {
          delete _passcodeDigits[i].dataset.dot;
        }
      }
    }

    function _resetScreen() {
      _passcodeBuffer = '';
      _changeMode('edit');
      _updatePasscodeUI();
    }

    function _checkPasscode() {
      if (_passcodeBuffer.length === 4) {
        _settings.pin = _passcodeBuffer;
        _hideErrorMessage();
        return true;
      }
      return false;
    }

    /**
     * Triggers the passcode change screen
     */
    function _changePassword() {
      passcodeChange.change(_mobileConnection, _settings)
      .then(function success() {
        // exit
        SettingsService.back();
      }).catch(function error(err) {
        // back to first screen
        _resetScreen();

        // show error
        _showErrorMessage('incorrect');
      });

    }

    return SettingsPanel({
      onInit: function cb_onInit(panel) {
        _mobileConnection = window.navigator.mozMobileConnections[
          DsdsSettings.getIccCardIndexForCallSettings()
        ];
        _voiceServiceClassMask = _mobileConnection.ICC_SERVICE_CLASS_VOICE;

        _passcodePanel =
          document.getElementById('call-barring-passcode-change');
        _passcodeHeader = _passcodePanel.querySelector('gaia-header');
        _passcodeInput = _passcodePanel.querySelector('.passcode-input');
        _passcodeError = _passcodePanel.querySelector('.passcode-error');
        _passcodeDigits =
          _passcodePanel.querySelectorAll('.passcode-digit');
        _passcodeContainer =
          _passcodePanel.querySelector('.passcode-container');
        _changePasscodeButton =
          _passcodePanel.querySelector('.passcode-change');

        _passcodeInput.addEventListener('keypress', _getInputKey);
        _changePasscodeButton.addEventListener('click', _changePassword);

        // restore focus by touching the container around the pseudo-input.
        _passcodeContainer.addEventListener('click',
          function inputClick(evt) {
            _passcodeInput.focus();
            _hideErrorMessage();
            evt.preventDefault();
          }
        );
      },

      onBeforeShow: function cb_beforeShow() {
        _changeMode('edit');
      },

      onShow: function cb_onShow() {
        _passcodeInput.focus();
      },

      onBeforeHide: function cb_onHide() {
        _resetScreen();
      }
    });
  };
});
