/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

function SimPinDialog(dialog) {
  var conns = window.navigator.mozMobileConnections;
  var icc;

  if (!conns) {
    return;
  }

  var _localize = navigator.mozL10n.localize;


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
  function numberPasswordInput(area) {
    var input = area.querySelector('input');
    input.addEventListener('input', function(evt) {
      if (evt.target === input) {
        dialogDone.disabled = (input.value.length < 4);
      }
    });
    return input;
  }
  var pinInput = numberPasswordInput(pinArea);
  var pukInput = numberPasswordInput(pukArea);
  var newPinInput = numberPasswordInput(newPinArea);
  var confirmPinInput = numberPasswordInput(confirmPinArea);

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

  // card lock error messages
  function handleCardLockError(event) {
    var type = event.lockType; // expected: 'pin', 'fdn', 'puk'
    if (!type) {
      skip();
      return;
    }

    // after three strikes, ask for PUK/PUK2
    var count = event.retryCount;
    if (count <= 0) {
      if (type === 'pin') {
        _action = initUI('unlock_puk');
        pukInput.focus();
      } else if (type === 'fdn') {
        _action = initUI('unlock_puk2');
        pukInput.focus();
      } else { // out of PUK/PUK2: we're doomed
        skip();
      }
      return;
    }

    var msgId = (count > 1) ? 'AttemptMsg3' : 'LastChanceMsg';
    showMessage(type + 'ErrorMsg', type + msgId, { n: count });
    showRetryCount(count);

    if (type === 'pin' || type === 'fdn') {
      pinInput.focus();
    } else if (type === 'puk') {
      pukInput.focus();
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
      handleCardLockError(req.error);
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
    req.onerror = function sp_unlockError() {
      handleCardLockError(req.error);
    };
  }


  /**
   * Add|Edit|Remove FDN contact
   */

  var _fdnContactInfo = {};

  function updateFdnContact() {
    var req = icc.updateContact('fdn', _fdnContactInfo, pinInput.value);

    req.onsuccess = function onsuccess() {
      _onsuccess(_fdnContactInfo);
      close();
    };

    req.onerror = function onerror(e) {
      var wrongPin2 = /IncorrectPassword/.test(req.error.name);
      if (wrongPin2) { // TODO: count retries (not supported by the platform)
        _action = initUI('get_pin2');
        showMessage('fdnErrorMsg');
        pinInput.value = '';
        pinInput.focus();
      } else {
        _oncancel(_fdnContactInfo);
        close();
        throw new Error('Could not edit FDN contact on SIM card', e);
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
        setInputMode('new');
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
        setInputMode('new');
        _localize(dialogTitle, 'fdnReset');
        break;

      // unsupported
      default:
        console.error('unsupported "' + action + '" action');
        return '';
    }

    // display the number of remaining retries if necessary
    // XXX this only works with the emulator (and some commercial RIL stacks...)
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
    var conn = conns[options.cardIndex || 0];

    if (!conn) {
      return;
    }

    var iccId = conn.iccId;
    icc = window.navigator.mozIccManager.getIccById(iccId);

    if (!icc) {
      return;
    }

    var dialogPanel = '#' + dialog.id;
    if (dialogPanel == Settings.currentPanel) {
      return;
    }

    _action = initUI(action);
    if (!_action) {
      skip();
      return;
    }

    _origin = options.exitPanel || Settings.currentPanel;
    Settings.currentPanel = dialogPanel;

    _onsuccess = (typeof options.onsuccess === 'function') ?
        options.onsuccess : function() {};
    _oncancel = (typeof options.oncancel === 'function') ?
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

