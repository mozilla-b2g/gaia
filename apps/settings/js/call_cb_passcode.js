/* exported InputPasscodeScreen */

'use strict';

var InputPasscodeScreen = (function() {
  const PIN_SIZE = 4;

  var panel,
      container,
      input,
      btnOK,
      btnCancel;
  var _passcodeDigits,
      _passcodeBuffer;

  function _getInputKey(evt) {
    var code = evt.charCode;
    if (code !== 0 && (code < 0x30 || code > 0x39)) {
      return;
    }

    var key = String.fromCharCode(code);

    if (evt.charCode === 0) { // Deletion
      if (_passcodeBuffer.length > 0) {
        _passcodeBuffer = _passcodeBuffer.substring(0,
          _passcodeBuffer.length - 1);
      }
    } else if (_passcodeBuffer.length < PIN_SIZE) {
      _passcodeBuffer += key;
    }

    _updateUI();
  }

  function _updateUI() {
    for (var i = 0; i < PIN_SIZE; i++) {
      if (i < _passcodeBuffer.length) {
        _passcodeDigits[i].dataset.dot = true;
      } else {
        delete _passcodeDigits[i].dataset.dot;
      }
    }

    btnOK.disabled = _passcodeBuffer.length === PIN_SIZE ? false : true;
  }

  function _init() {
    panel = document.getElementById('cb-passcode');
    container = panel.querySelector('.passcode-container');
    input = panel.querySelector('.passcode-input');
    _passcodeDigits = panel.querySelectorAll('.passcode-digit');
    _passcodeBuffer = '';

    btnOK = document.getElementById('cb-passcode-ok-btn');
    btnCancel = document.getElementById('cb-passcode-cancel-btn');

    container.addEventListener('click', function(evt) {
      input.focus();
      evt.preventDefault();
    });

    input.addEventListener('keypress', _getInputKey);
  }

  function _showPanel() {
    return new Promise(function showing(resolve, reject) {
      panel.hidden = false;
      input.focus();
      btnOK.addEventListener('click', function okClicked() {
        btnOK.removeEventListener('click', okClicked);
        if (_passcodeBuffer.length === 4) {
          var password = _passcodeBuffer;
          _closePanel();
          resolve(password);
        } //TODO else SHOW_ERROR
      });
      btnCancel.addEventListener('click', function cancelClicked() {
        btnCancel.removeEventListener('click', cancelClicked);
        _closePanel();
        reject();
      });
    });
  }

  function _closePanel() {
    _passcodeBuffer = '';
    _updateUI();
    panel.hidden = true;
  }

  return {
    init: _init,
    show: _showPanel
  };
})();


/**
 * Startup.
 */
navigator.mozL10n.once(function loadWhenIdle() {
  var idleObserver = {
    time: 3,
    onidle: function() {
      navigator.removeIdleObserver(idleObserver);
      InputPasscodeScreen.init();
    }
  };
  navigator.addIdleObserver(idleObserver);
});
