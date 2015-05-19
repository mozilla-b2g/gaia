/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global Settings, getIccByIndex */

'use strict';

function SimPinDialog(dialog) {
  var icc;
  var currentMode = '';
  var _localize = navigator.mozL10n.setAttributes;
  var translate = navigator.mozL10n.get;

  if (!window.navigator.mozMobileConnections) {
    return;
  }

  /**
   * Global variables and callbacks -- set by the main `show()' method
   */

  var _origin = ''; // id of the dialog caller (specific to the Settings app)
  var _action = ''; // requested action: unlock*, enable*, disable*, change*
  var _onsuccess = function() {};
  var _oncancel = function() {};

  var _allowedRetryCounts = {
    'pin': 3,
    'pin2': 3,
    'puk': 10,
    'puk2': 10
  };

  /**
   * User Interface constants
   */

  var dialogHeader = dialog.querySelector('gaia-header');
  var dialogTitle = dialog.querySelector('gaia-header h1');
  var dialogDone = dialog.querySelector('button[type="submit"]');

  dialogHeader.addEventListener('action', skip);
  dialogDone.onclick = verify;

  // numeric inputs -- 3 possible input modes:
  //   `pin': show pin input
  //   `puk': show puk and newPin+confirmPin inputs
  //   `new': show pin and newPin+confirmPin inputs
  var pinArea = dialog.querySelector('.sim-pinArea');
  var pukArea = dialog.querySelector('.sim-pukArea');
  var newPinArea = dialog.querySelector('.sim-newPinArea');
  var confirmPinArea = dialog.querySelector('.sim-confirmPinArea');

  var pinInput = numberPasswordInput(pinArea);
  var pukInput = numberPasswordInput(pukArea);
  var newPinInput = numberPasswordInput(newPinArea);
  var confirmPinInput = numberPasswordInput(confirmPinArea);

  function setInputMode(mode) {
    currentMode = mode;
    pinArea.hidden = (mode === 'puk');
    pukArea.hidden = (mode !== 'puk');
    newPinArea.hidden = confirmPinArea.hidden = (mode === 'pin');
  }

  function updateDoneButtonState() {
    switch (currentMode) {
      case 'change_pin':
        if (pinInput.value.length < 4 ||
          newPinInput.value.length < 4 ||
          confirmPinInput.value.length < 4 ||
          newPinInput.value.length !== confirmPinInput.value.length) {
            dialogDone.disabled = true;
        } else {
          dialogDone.disabled = false;
        }
        break;

      case 'pin':
        dialogDone.disabled = (pinInput.value.length < 4);
        break;

      case 'puk':
        dialogDone.disabled = (pukInput.value.length < 4);
        break;

      default:
        console.error('we should not jump to this condition');
        break;
    }
  }

  function numberPasswordInput(area) {
    var input = area.querySelector('input');
    input.oninput = function() {
      updateDoneButtonState();
    };
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
    errorMsgHeader.setAttribute('data-l10n-id', headerL10nId);
    _localize(errorMsgBody, bodyL10nId, args);
    errorMsg.hidden = false;
  }

  // "[n] tries left" error messages
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
   * Tells users how many remaining attempts for submitting their password are
   * left, and focuses on the right input element depending on the lockType.
   *
   * @param {string} lockType e.g. 'pin', 'puk', 'fdn' etc.
   * @param {number} retryCount Amount of retries left.
   */
  function _handleRetryPassword(lockType, retryCount) {
    if (retryCount <= 0 || typeof retryCount !== 'number') {
      console.warning('Called _handleRetryPassword with incorrect retryCount ' +
                      'argument');
      return;
    }

    var msgId = retryCount > 1 ? 'AttemptMsg3' : 'LastChanceMsg';
    showMessage(lockType + 'ErrorMsg', lockType + msgId, { n: retryCount });
    showRetryCount(retryCount);

    if (lockType === 'pin' || lockType === 'fdn') {
      pinInput.focus();
    } else if (lockType === 'puk') {
      pukInput.focus();
    }
  }

  /**
   * Handles errors that happened when trying to lock or unlock the SIM
   * Card. The potential errors are defined in `ril_consts.js`.
   *
   * @param {object} error - IccCardLockError error object
   */
  function handleCardLockError(error) {
    var name = error.name;
    var retryCount = error.retryCount;
    var lockType = error.lockType;

    if (!lockType) {
      console.error('`handleCardLockError` called without a lockType. ' +
                    'This should never even happen.', error);
      skip();
      return;
    }

    switch (name) {
      case 'SimPuk2':
        _action = initUI('unlock_puk2');
        pukInput.focus();
        break;
      case 'IncorrectPassword':
        if (retryCount > 0) {
          _handleRetryPassword(lockType, retryCount);
        } else {
          // Skipping instead of opening puk UI because the system app will
          // take care of it (otherwise we would end up with 2 consecutive puk
          // dialogs).
          skip();
        }
        break;
      default:
        alert(translate('genericLockError'));
        console.error('Error of type ' + name + ' happened coming from an ' +
                      'IccCardLockError event', error);
        skip();
    }
  }

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

  function unlockPuk(lockType) { // lockType = `puk' or `puk2'
    lockType = lockType || 'puk';
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
    unlockCardLock({ lockType: lockType, puk: puk, newPin: newPin });
    clear();
  }

  function unlockCardLock(options) {
    var req = icc.unlockCardLock(options);
    req.onsuccess = function sp_unlockSuccess() {
      close();
      _onsuccess();
    };
    req.onerror = function sp_unlockError() {
      var error = req.error;
      error.lockType = options.lockType;

      handleCardLockError(error);
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
    lockType = lockType || 'pin';
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
    var req = icc.setCardLock(options);
    req.onsuccess = function spl_enableSuccess() {
      close();
      _onsuccess();
    };
    req.onerror = function sp_enableError() {
      var error = req.error;
      error.lockType = options.lockType;

      handleCardLockError(error);
    };
  }


  /**
   * Add|Edit|Remove FDN contact
   */

  var _fdnContactInfo = {};

  /**
   * Updates a FDN contact. For some reason, `icc.updateContact` requires the
   * pin input value instead of delegating to `icc.setCardLock`. That means
   * that, in case of failure, the error is different that the one that
   * `icc.setCardLock` gives. This means that we have to handle it separatedly
   * instead of being able to use the existing `handleCardLockError` above.
   * Among other things, it doesn't include the retryCount, so we can't tell
   * the user how many remaining tries she has. What a mess.
   *
   * This should be solved when bug 1070941 is fixed.
   */
  function updateFdnContact() {
    var req = icc.updateContact('fdn', _fdnContactInfo, pinInput.value);

    req.onsuccess = function onsuccess() {
      _onsuccess(_fdnContactInfo);
      close();
    };

    req.onerror = function onerror(e) {
      switch (req.error.name) {
        case 'IncorrectPassword':
        case 'SimPin2':
          // TODO: count retries (not supported by the platform) -> Bug 1070941
          _action = initUI('get_pin2');
          showMessage('fdnErrorMsg');
          pinInput.value = '';
          pinInput.focus();
          break;
        case 'SimPuk2':
          _action = initUI('unlock_puk2');
          pukInput.focus();
          break;
        case 'NoFreeRecordFound':
          alert(translate('fdnNoFDNFreeRecord'));
          _oncancel(_fdnContactInfo);
          close();
          break;
        default:
          _oncancel(_fdnContactInfo);
          close();
          console.error('Could not edit FDN contact on SIM card', e);
      }
    };
  }


  /**
   * Dialog box handling
   */

  function verify() { // apply PIN|PUK
    switch (_action) {
      // get PIN code
      case 'get_pin':
        _onsuccess(pinInput.value);
        close();
        break;

      // unlock SIM
      case 'unlock_pin':
        unlockPin();
        break;
      case 'unlock_puk':
        unlockPuk('puk');
        break;
      case 'unlock_puk2':
        unlockPuk('puk2');
        break;

      // PIN lock
      case 'enable_lock':
        enableLock(true);
        break;
      case 'disable_lock':
        enableLock(false);
        break;
      case 'change_pin':
        changePin('pin');
        break;

      // get PIN2 code (FDN contact list)
      case 'get_pin2':
        updateFdnContact();
        break;

      // PIN2 lock (FDN)
      case 'enable_fdn':
        enableFdn(true);
        break;
      case 'disable_fdn':
        enableFdn(false);
        break;
      case 'change_pin2':
        changePin('pin2');
        break;
    }

    return false;
  }

  function clear() {
    errorMsg.hidden = true;
    triesLeftMsg.hidden = true;
    errorMsgHeader.textContent = '';
    errorMsgBody.textContent = '';
    triesLeftMsg.textContent = '';
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
   * Expose a main `show()` method
   */
  function initUI(action) {
    showMessage();
    showRetryCount(); // Clear the retry count at first
    dialogDone.disabled = true;

    var lockType = 'pin'; // used to query the number of retries left
    switch (action) {
      // get PIN code
      case 'get_pin2':
        lockType = 'pin2';
      case 'get_pin':
        setInputMode('pin');
        _localize(dialogTitle, lockType + 'Title');
        break;

      // unlock SIM
      case 'unlock_pin':
        setInputMode('pin');
        _localize(dialogTitle, 'pinTitle');
        break;
      case 'unlock_puk':
        lockType = 'puk';
        setInputMode('puk');
        showMessage('simCardLockedMsg', 'enterPukMsg');
        _localize(dialogTitle, 'pukTitle');
        break;
      case 'unlock_puk2':
        lockType = 'puk2';
        setInputMode('puk');
        showMessage('simCardLockedMsg', 'enterPuk2Msg');
        _localize(dialogTitle, 'puk2Title');
        break;

      // PIN lock
      case 'enable_lock':
      case 'disable_lock':
        setInputMode('pin');
        _localize(dialogTitle, 'pinTitle');
        break;
      case 'change_pin':
        setInputMode('change_pin');
        _localize(dialogTitle, 'newpinTitle');
        break;

      // FDN lock (PIN2)
      case 'enable_fdn':
        lockType = 'pin2';
        setInputMode('pin');
        _localize(dialogTitle, 'fdnEnable');
        break;
      case 'disable_fdn':
        lockType = 'pin2';
        setInputMode('pin');
        _localize(dialogTitle, 'fdnDisable');
        break;
      case 'change_pin2':
        lockType = 'pin2';
        setInputMode('change_pin');
        _localize(dialogTitle, 'fdnReset');
        break;

      // unsupported
      default:
        console.error('unsupported "' + action + '" action');
        return '';
    }

    // display the number of remaining retries if necessary
    // XXX this only works with emulator (and some commercial RIL stacks...)
    // https://bugzilla.mozilla.org/show_bug.cgi?id=905173
    var req = icc.getCardLockRetryCount(lockType);
    req.onsuccess = function() {
      var retryCount = req.result.retryCount;
      if (retryCount === _allowedRetryCounts[lockType]) {
        // hide the retry count if users had not input incorrect codes
        retryCount = null;
      }
      showRetryCount(retryCount);
    };
    return action;
  }

  function show(action, options) {
    options = options || {};

    var dialogPanel = '#' + dialog.id;
    icc = getIccByIndex(options.cardIndex);

    if (!icc || dialogPanel === Settings.currentPanel) {
      return;
    }

    _action = initUI(action);

    if (!_action) {
      skip();
      return;
    }

    _origin = Settings.currentPanel;
    Settings.currentPanel = dialogPanel;

    _onsuccess = typeof options.onsuccess === 'function' ?
      options.onsuccess : function() {};
    _oncancel = typeof options.oncancel === 'function' ?
      options.oncancel : function() {};

    _fdnContactInfo = options.fdnContact;

    window.addEventListener('panelready', function inputFocus() {
      window.removeEventListener('panelready', inputFocus);
      if (_action === 'unlock_puk' || _action === 'unlock_puk2') {
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

