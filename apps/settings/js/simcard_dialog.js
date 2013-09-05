/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function SimPinDialog(dialog) {
  if (!window.navigator.mozMobileConnection || !IccHelper.enabled)
    return;

  // `_origin' records the dialog caller (updated by the `show()' method):
  // when the dialog is closed, we can relocate back to the caller's div.
  var _origin = '';
  var _action = 'unlock';
  var _lockType = 'pin';
  var _localize = navigator.mozL10n.localize;


  /**
   * User Interface constants
   */

  var dialogTitle = dialog.querySelector('header h1');
  var dialogDone = dialog.querySelector('button[type="submit"]');
  var dialogClose = dialog.querySelector('button[type="reset"]');
  dialogDone.onclick = verify;
  dialogClose.onclick = skip;

  // numeric inputs -- 3 possible input modes:
  //   `pin': show pin input
  //   `puk': show puk and newPin+confirmPin inputs
  //   `new': show pin and newPin+confirmPin inputs
  var pinArea = dialog.querySelector('.sim-pinArea');
  var pukArea = dialog.querySelector('.sim-pukArea');
  var newPinArea = dialog.querySelector('.sim-newPinArea');
  var confirmPinArea = dialog.querySelector('.sim-confirmPinArea');
  function setInputMode(mode) {
    pinArea.hidden = (mode === 'puk');
    pukArea.hidden = (mode !== 'puk');
    newPinArea.hidden = confirmPinArea.hidden = (mode === 'pin');
  }
  var pinInput = numberPasswordInput(pinArea);
  var pukInput = numberPasswordInput(pukArea);
  var newPinInput = numberPasswordInput(newPinArea);
  var confirmPinInput = numberPasswordInput(confirmPinArea);
  function numberPasswordInput(area) {
    var input = area.querySelector('input');
    input.addEventListener('input', function(evt) {
      if (evt.target === input) {
        dialogDone.disabled = (input.value.length < 4);
      }
    });
    return input;
  }

  // error messages
  var errorMsg = dialog.querySelector('.sim-errorMsg');
  var errorMsgHeader = dialog.querySelector('.sim-messageHeader');
  var errorMsgBody = dialog.querySelector('.sim-messageBody');
  function showMessage(headerL10nId, bodyL10nId, args) {
    if (!headerL10nId) {
      errorMsg.hidden = true;
      return;
    }
    _localize(errorMsgHeader, headerL10nId);
    _localize(errorMsgBody, bodyL10nId, args);
    errorMsg.hidden = false;
  }

  // "[n] tries left" messages
  var triesLeftMsg = dialog.querySelector('.sim-triesLeft');
  function showRetryCount(retryCount) {
    if (!retryCount) {
      triesLeftMsg.hidden = true;
    } else {
      _localize(triesLeftMsg, 'inputCodeRetriesLeft', { n: retryCount });
      triesLeftMsg.hidden = false;
    }
  }


  /**
   * SIM card state and errors
   */

  function handleCardState() {
    switch (IccHelper.cardState) {
      case 'pinRequired':
        _lockType = 'pin';
        setInputMode('pin');
        pinInput.focus();
        showMessage();
        break;
      case 'pukRequired':
        _lockType = 'puk';
        setInputMode('puk');
        pukInput.focus();
        showMessage('simCardLockedMsg', 'enterPukMsg');
        break;
      default:
        skip();
        break;
    }
    _localize(dialogTitle, _lockType + 'Title');
  }

  IccHelper.addEventListener('icccardlockerror', function(event) {
    var count = event.retryCount;
    if (!count) {
      skip();
      return;
    }
    var type = event.lockType;
    var msgId = (count > 1) ? 'AttemptMsg3' : 'LastChanceMsg';
    showMessage(type + 'ErrorMsg', type + msgId, { n: count });
    showRetryCount(count);
    if (type === 'pin' || type === 'fdn') {
      pinInput.focus();
    } else if (type === 'puk') {
      pukInput.focus();
    }
  });


  /**
   * SIM card helpers -- unlockCardLock
   */

  function unlockPin() {
    var pin = pinInput.value;
    if (pin === '') {
      return;
    }
    unlockCardLock({ lockType: 'pin', pin: pin });
    clear();
  }

  function unlockPuk() {
    var puk = pukInput.value;
    var newPin = newPinInput.value;
    var confirmPin = confirmPinInput.value;
    if (puk === '' || newPin === '' || confirmPin === '') {
      return;
    }
    if (newPin !== confirmPin) {
      showMessage('newPinErrorMsg');
      newPinInput.value = '';
      confirmPinInput.value = '';
      return;
    }
    unlockCardLock({ lockType: 'puk', puk: puk, newPin: newPin });
    clear();
  }

  function unlockCardLock(options) {
    var req = IccHelper.unlockCardLock(options);
    req.onsuccess = function sp_unlockSuccess() {
      close();
      _onsuccess();
    };
  }


  /**
   * SIM card helpers -- setCardLock
   */

  function enableLock(enabled) {
    var pin = pinInput.value;
    if (pin === '') {
      return;
    }
    setCardLock({ lockType: 'pin', pin: pin, enabled: enabled });
    clear();
  }

  function enableFdn(enabled) {
    var pin = pinInput.value;
    if (pin === '') {
      return;
    }
    setCardLock({ lockType: 'fdn', pin2: pin, enabled: enabled });
    clear();
  }

  function changePin(lockType) { // lockType = `pin' or `pin2'
    var pin = pinInput.value;
    var newPin = newPinInput.value;
    var confirmPin = confirmPinInput.value;
    if (pin === '' || newPin === '' || confirmPin === '') {
      return;
    }
    if (newPin !== confirmPin) {
      showMessage('newPinErrorMsg');
      newPinInput.value = '';
      confirmPinInput.value = '';
      return;
    }
    setCardLock({ lockType: lockType, pin: pin, newPin: newPin });
    clear();
  }

  function setCardLock(options) {
    var req = IccHelper.setCardLock(options);
    req.onsuccess = function spl_enableSuccess() {
      close();
      _onsuccess();
    };
  }


  /**
   * Dialog box handling -- expose a `show' method
   */

  function verify() {
    switch (_action) {
      // PIN lock
      case 'unlock':
        if (_lockType === 'pin') {
          unlockPin();
        } else if (_lockType === 'puk') {
          unlockPuk();
        }
        break;
      case 'enableLock':
        enableLock(true);
        break;
      case 'disableLock':
        enableLock(false);
        break;
      case 'changePin':
        changePin('pin');
        break;

      // FDN lock
      case 'enableFdn':
        enableFdn(true);
        break;
      case 'disableFdn':
        enableFdn(false);
        break;
      case 'changePin2':
        changePin('pin2');
        break;
    }

    return false;
  }

  function clear() {
    errorMsg.hidden = true;
    pinInput.value = '';
    pukInput.value = '';
    newPinInput.value = '';
    confirmPinInput.value = '';
  }

  function _onsuccess() {};
  function _oncancel() {};

  function show(action, onsuccess, oncancel) {
    var dialogPanel = '#' + dialog.id;
    if (dialogPanel == Settings.currentPanel)
      return;

    dialogDone.disabled = true;
    _lockType = 'pin';

    switch (action) {
      case 'unlock':
        handleCardState();
        break;
      case 'enableLock':
      case 'disableLock':
        setInputMode('pin');
        _localize(dialogTitle, 'pinTitle');
        break;
      case 'changePin':
      case 'changePin2': // XXX should set _lockType to 'pin2'?
        setInputMode('new');
        _localize(dialogTitle, 'newpinTitle');
        break;
      case 'enableFdn':  // XXX should set _lockType to 'fdn'?
      case 'disableFdn': // XXX should set _lockType to 'fdn'?
        setInputMode('pin');
        _localize(dialogTitle, 'fdnTitle');
        break;
    }

    IccHelper.getCardLockRetryCount(_lockType, showRetryCount);

    if (onsuccess && typeof onsuccess === 'function') {
      _onsuccess = onsuccess;
    }
    if (oncancel && typeof oncancel === 'function') {
      _oncancel = oncancel;
    }

    _action = action;
    _origin = Settings.currentPanel;
    Settings.currentPanel = dialogPanel;

    window.addEventListener('panelready', function inputFocus() {
      window.removeEventListener('panelready', inputFocus);
      if (action === 'unlock' && _lockType === 'puk') {
        pukInput.focus();
      } else {
        pinInput.focus();
      }
    });
  }

  function close() {
    clear();
    if (_origin) {
      Settings.currentPanel = _origin;
    }
  }

  function skip() {
    close();
    _oncancel();
    return false;
  }

  return {
    show: show
  };
}

