/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function SimPinDialog(dialog) {
  if (!window.navigator.mozMobileConnection || !IccHelper.enabled)
    return;

  var _localize = navigator.mozL10n.localize;


  /**
   * Global variables and callbacks -- updated by the main `show()' method
   */

  var _origin = '';       // id of the dialog caller
  var _action = 'unlock'; // requested action
  var _onsuccess = function() {};
  var _oncancel = function() {};


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
   * SIM card state
   */

  /* function handleCardState() {
    var lockType = 'pin';
    switch (IccHelper.cardState) {
      case 'pinRequired':
        setInputMode('pin');
        // pinInput.focus();
        showMessage();
        break;
      case 'pukRequired':
        lockType = 'puk';
        setInputMode('puk');
        // pukInput.focus();
        showMessage('simCardLockedMsg', 'enterPukMsg');
        break;
      default:
        skip();
        break;
    }
    _localize(dialogTitle, lockType + 'Title');
  } */

  IccHelper.addEventListener('icccardlockerror', function(event) {
    var count = event.retryCount;
    if (!count) {
      skip();
      return;
    }
    var type = event.lockType; // expected: 'pin', 'fdn', 'puk'
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
   * Dialog box handling
   */

  function verify() { // apply PIN|PUK
    switch (_action) {
      // PIN lock
      case 'unlockPin':
        unlockPin();
        break;
      case 'unlockPuk':
        unlockPuk();
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

      // PIN2 lock (FDN)
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


  /**
   * Expose a main `show()' method
   */

  function initUI(action) {
    var lockType = 'pin';

    switch (action) {
      case 'unlock': // => action can be either `unlockPin' or `unlockPuk'
        switch (IccHelper.cardState) {
          case 'pinRequired':
            action = 'unlockPin';
            showMessage();
            break;
          case 'pukRequired':
            lockType = 'puk';
            action = 'unlockPuk';
            showMessage('simCardLockedMsg', 'enterPukMsg');
            break;
          default:
            return '';
        }
        setInputMode(lockType);
        _localize(dialogTitle, lockType + 'Title');
        break;

      case 'enableLock':
      case 'disableLock':
        setInputMode('pin');
        _localize(dialogTitle, 'pinTitle');
        break;

      case 'enableFdn':
      case 'disableFdn':
        lockType = 'pin2';
        setInputMode('pin');
        _localize(dialogTitle, 'fdnTitle');
        break;

      case 'changePin2':
        lockType = 'pin2';
      case 'changePin':
        setInputMode('new');
        _localize(dialogTitle, 'newpinTitle');
        break;

      default:
        console.error('unsupported "' + action + '" action');
        return '';
    }

    // display the number of remaining retries if necessary
    // XXX only works with the emulator, see bug 905173
    // https://bugzilla.mozilla.org/show_bug.cgi?id=905173
    IccHelper.getCardLockRetryCount(lockType, showRetryCount);
    return action;
  }

  function show(action, onsuccess, oncancel) {
    var dialogPanel = '#' + dialog.id;
    if (dialogPanel == Settings.currentPanel) {
      return;
    }
    dialogDone.disabled = true;

    _action = initUI(action);
    if (!_action) {
      skip();
      return;
    }

    _origin = Settings.currentPanel;
    Settings.currentPanel = dialogPanel;

    _onsuccess = (typeof onsuccess === 'function') ? onsuccess : function() {};
    _oncancel = (typeof oncancel === 'function') ? oncancel : function() {};

    window.addEventListener('panelready', function inputFocus() {
      window.removeEventListener('panelready', inputFocus);
      if (_action === 'unlockPuk') {
        pukInput.focus();
      } else {
        pinInput.focus();
      }
    });
  }

  return {
    show: show
  };
}

