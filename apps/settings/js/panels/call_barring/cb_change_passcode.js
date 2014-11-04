/* export ChangePasscodeScreen */

define(function(require) {
  'use strict';

  var ChangePasscodeScreen = function() {
    /**
     * edit    : when the user presses edit passcode button
     * new     : when the user is editing passcode
     *                and has entered old passcode successfully
     */
    var _MODE;
    var _settings = {
      pin: '',
      newPin: ''
    };
    var resultPromise = {
      resolve: null,
      reject: null
    };

    var _checkingLength = {
      'new': 8,
      'edit': 4
    };


    var _passcodeBuffer = '';
    var _DOM = {
      passcodePanel: null,
      passcodeHeader: null,
      passcodeInput: null,
      passcodeDigits: null,
      passcodeContainer: null,
      changePasscodeButton: null
    };

    function _init() {
      _DOM.passcodePanel = document.getElementById('call-cb-passcode');
      _DOM.passcodeHeader = _DOM.passcodePanel.querySelector('gaia-header');
      _DOM.passcodeInput = _DOM.passcodePanel.querySelector('.passcode-input');
      _DOM.passcodeDigits =
        _DOM.passcodePanel.querySelectorAll('.passcode-digit');
      _DOM.passcodeContainer =
        _DOM.passcodePanel.querySelector('.passcode-container');
      _DOM.changePasscodeButton =
        _DOM.passcodePanel.querySelector('.passcode-change');

      _DOM.passcodeInput.addEventListener('keypress', _getInputKey);
      _DOM.changePasscodeButton.addEventListener('click', _changePassword);

      // restore focus by touching the container around the pseudo-input.
      _DOM.passcodeContainer.addEventListener('click',
        function inputClick(evt) {
          _DOM.passcodeInput.focus();
          evt.preventDefault();
        }
      );

      // clean the UI before we leave (gaia-header back action)
      // also cancel the request (promise.reject)
      _DOM.passcodeHeader.addEventListener('action', function backClick(evt) {
        _cleanScreen();
        resultPromise.reject();
      });

      _DOM.passcodePanel.dataset.mode = _MODE = 'edit';
      _DOM.passcodeInput.focus();


      return new Promise(function done(resolve, reject) {
        resultPromise.resolve = resolve;
        resultPromise.reject = reject;
      });
    }

    function _changeMode(mode) {
      _hideErrorMessage();
      _DOM.passcodePanel.dataset.mode = _MODE = mode;
      _updatePassCodeUI();
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
      if (evt.charCode === 0) { // delete
        if (_passcodeBuffer.length > 0) {
          _passcodeBuffer = _passcodeBuffer.substring(0,
            _passcodeBuffer.length - 1);
          if (_DOM.passcodePanel.dataset.passcodeStatus === 'success') {
            _resetPasscodeStatus();
          }
        }
      } else if (_passcodeBuffer.length < 8) {
        _passcodeBuffer += key;
      }

      _updatePassCodeUI();
      _enablePasscode();
    }

    function _enablePasscode() {
      if (_passcodeBuffer.length === _checkingLength[_MODE]) {
        switch (_MODE) {
          case 'edit':
            if (_checkPasscode()) {
              _passcodeBuffer = '';
              _updatePassCodeUI();
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
              _showErrorMessage();
            }
            break;
        }
      }
    }

    function _showErrorMessage(message) {
      _DOM.passcodePanel.dataset.passcodeStatus = 'error';
    }

    function _hideErrorMessage() {
      _DOM.passcodePanel.dataset.passcodeStatus = '';
    }

    function _resetPasscodeStatus() {
      _DOM.passcodePanel.dataset.passcodeStatus = '';
    }

    function _enableButton() {
      _DOM.passcodePanel.dataset.passcodeStatus = 'success';
    }

    function _updatePassCodeUI() {
      for (var i = 0; i < 8; i++) {
        if (i < _passcodeBuffer.length) {
          _DOM.passcodeDigits[i].dataset.dot = true;
        } else {
          delete _DOM.passcodeDigits[i].dataset.dot;
        }
      }
    }

    function _cleanScreen() {
      _hideErrorMessage();
      _passcodeBuffer = '';
      _updatePassCodeUI();
    }

    function _checkPasscode() {
      if (_passcodeBuffer.length === 4) {
        _settings.pin = _passcodeBuffer;
        _hideErrorMessage();
        return true;
      }
      _showErrorMessage();
      return false;
    }

    // send data to call.js and close the panel
    function _changePassword() {
      resultPromise.resolve(_settings);
      _cleanScreen();
      Settings.currentPanel = '#call-cbSettings';
    }

    return {
      launch: _init
    };
  };

  return ChangePasscodeScreen;
});
