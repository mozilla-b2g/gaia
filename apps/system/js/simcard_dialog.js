/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global SIMSlotManager, SystemDialog */

'use strict';

var SimPinDialog = {
  _currentSlot: null,
  dialogTitle: document.querySelector('#simpin-dialog header h1'),
  dialogDone: document.querySelector('#simpin-dialog button[type="submit"]'),
  dialogSkip: document.querySelector('#simpin-dialog button[type="reset"]'),
  dialogBack: document.querySelector('#simpin-dialog button.back'),

  pinArea: document.getElementById('pinArea'),
  pukArea: document.getElementById('pukArea'),
  xckArea: document.getElementById('xckArea'),
  desc: document.querySelector('#xckArea div[name="xckDesc"]'),
  newPinArea: document.getElementById('newPinArea'),
  confirmPinArea: document.getElementById('confirmPinArea'),

  pinInput: null,
  pukInput: null,
  xckInput: null,
  newPinInput: null,
  confirmPinInput: null,

  triesLeftMsg: document.getElementById('triesLeft'),

  errorMsg: document.getElementById('errorMsg'),
  errorMsgHeader: document.getElementById('messageHeader'),
  errorMsgBody: document.getElementById('messageBody'),

  containerDiv: document.querySelector('#simpin-dialog .container'),

  lockType: 'pin',

  lockTypeMap: {
    'pinRequired': 'pin',
    'pukRequired': 'puk',
    'networkLocked': 'nck',
    'corporateLocked': 'cck',
    'serviceProviderLocked': 'spck'
  },

  getNumberPasswordInputField: function spl_wrapNumberInput(name) {
    var inputField = document.querySelector('input[name="' + name + '"]');
    var self = this;

    inputField.addEventListener('input', function(evt) {
      if (evt.target !== inputField) {
        return;
      }

      checkDialogDone();
    });

    inputField.addEventListener('focus', function() {
      checkDialogDone();
    });

    function checkDialogDone() {
      if (inputField.value.length >= 4) {
        self.dialogDone.disabled = false;
      } else {
        self.dialogDone.disabled = true;
      }
    }


    return inputField;
  },

  handleCardState: function spl_handleCardState() {
    var _ = navigator.mozL10n.get;

    if (!this._currentSlot) {
      return;
    }

    var card = this._currentSlot.simCard;

    var cardState = card.cardState;
    var lockType = this.lockTypeMap[cardState];

    var request = this._currentSlot.getCardLockRetryCount(lockType);
    request.onsuccess = (function() {
      var retryCount = request.result.retryCount;
      if (retryCount) {
        var l10nArgs = { n: retryCount };
        this.triesLeftMsg.textContent = _('inputCodeRetriesLeft', l10nArgs);
        this.triesLeftMsg.hidden = false;
      }
    }).bind(this);
    request.onerror = function() {
      console.error('Could not fetch CardLockRetryCount', request.error.name);
    };

    switch (lockType) {
      case 'pin':
        this.lockType = lockType;
        this.errorMsg.hidden = true;
        this.inputFieldControl(true, false, false, false);
        this.pinInput.focus();
        break;
      case 'puk':
        this.lockType = lockType;
        this.errorMsgHeader.textContent = _('simCardLockedMsg') || '';
        this.errorMsgBody.textContent = _('enterPukMsg') || '';
        this.errorMsg.hidden = false;
        this.inputFieldControl(false, true, false, true);
        this.pukInput.focus();
        break;
      case 'nck':
      case 'cck':
      case 'spck':
        this.lockType = lockType;
        this.errorMsg.hidden = true;
        this.inputFieldControl(false, false, true, false);
        this.desc.textContent = _(lockType + 'Code');
        this.xckInput.focus();
        break;
      default:
        this.skip();
        break;
    }
    if (this.lockType !== 'pin' || !SIMSlotManager.isMultiSIM()) {
      this.dialogTitle.textContent =
        _(this.lockType + 'Title') || '';
    } else {
      this.dialogTitle.textContent =
        _('multiSIMpinTitle', { n: this._currentSlot.index + 1 }) || '';
    }
  },

  handleError: function spl_handleLockError(evt) {
    var retry = (evt.retryCount) ? evt.retryCount : -1;
    this.showErrorMsg(retry, evt.lockType);
    if (retry === -1) {
      this.skip();
      return;
    }
    if (evt.lockType === 'pin') {
      this.pinInput.focus();
    } else if (evt.lockType === 'puk') {
      this.pukInput.focus();
    } else {
      this.xckInput.focus();
    }
  },

  showErrorMsg: function spl_showErrorMsg(retry, type) {
    var _ = navigator.mozL10n.get;
    var l10nArgs = { n: retry };

    this.triesLeftMsg.textContent = _('inputCodeRetriesLeft', l10nArgs);
    this.errorMsgHeader.textContent = _(type + 'ErrorMsg');
    if (retry !== 1) {
      this.errorMsgBody.textContent = _(type + 'AttemptMsg2', l10nArgs);
    } else {
      this.errorMsgBody.textContent = _(type + 'LastChanceMsg');
    }

    this.errorMsg.hidden = false;
  },

  unlockPin: function spl_unlockPin() {
    var pin = this.pinInput.value;
    if (pin === '') {
      return;
    }

    var options = { lockType: 'pin', pin: pin };
    this.unlockCardLock(options);
    this.clear();
  },

  unlockPuk: function spl_unlockPuk() {
    var _ = navigator.mozL10n.get;

    var puk = this.pukInput.value;
    var newPin = this.newPinInput.value;
    var confirmPin = this.confirmPinInput.value;
    if (puk === '' || newPin === '' || confirmPin === '') {
      return;
    }

    if (newPin !== confirmPin) {
      this.errorMsgHeader.textContent = _('newPinErrorMsg');
      this.errorMsgBody.textContent = '';
      this.errorMsg.hidden = false;
      return;
    }
    var options = {lockType: 'puk', puk: puk, newPin: newPin };
    this.unlockCardLock(options);
    this.clear();
  },

  unlockXck: function spl_unlockXck() {
    var xck = this.xckInput.value;
    if (xck === '') {
      return;
    }

    var options = {lockType: this.lockType, pin: xck };
    this.unlockCardLock(options);
    this.clear();
  },

  unlockCardLock: function spl_unlockCardLock(options) {
    var req = this._currentSlot.unlockCardLock(options);
    req.onsuccess = this.requestClose.bind(this, 'success');
    req.onerror = (function spl_unlockCardLockError(result) {
      this.handleError(req.error);
    }).bind(this);
  },

  inputFieldControl: function spl_inputField(isPin, isPuk, isXck, isNewPin) {
    this.pinArea.hidden = !isPin;
    this.pukArea.hidden = !isPuk;
    this.xckArea.hidden = !isXck;
    this.newPinArea.hidden = !isNewPin;
    this.confirmPinArea.hidden = !isNewPin;
  },

  verify: function spl_verify() {
    if (this.lockType === 'pin') {
      this.unlockPin();
    } else if (this.lockType === 'puk') {
      this.unlockPuk();
    } else {
      this.unlockXck();
    }
    return false;
  },

  onHide: function spl_onHide(reason) {
    this.clear();
    if (this.onclose) {
      this.onclose(reason);
    }
  },

  clear: function spl_clear() {
    this.errorMsg.hidden = true;
    this.pinInput.value = '';
    this.pinInput.blur();
    this.pukInput.value = '';
    this.pukInput.blur();
    this.xckInput.value = '';
    this.xckInput.blur();
    this.newPinInput.value = '';
    this.newPinInput.blur();
    this.confirmPinInput.value = '';
    this.confirmPinInput.blur();
  },

  onclose: null,
  /**
   * Show the SIM pin dialog
   * @param {Object} slot SIMSlot instance
   * @param {Function} [onclose] Optional function called when dialog is closed.
   *                            Receive a single argument being the reason of
   *                            dialog closing: success, skip, home or holdhome.
   * @param {Boolean} [skipped] If the last slot is skipped or not.
   */
  show: function spl_show(slot, onclose, skipped) {
    if (slot) {
      this._currentSlot = slot;
    }

    window.dispatchEvent(new CustomEvent('simpinshow'));

    this.systemDialog.show();
    this.lockType = 'pin';
    this.handleCardState();

    if (onclose && typeof onclose === 'function') {
      this.onclose = onclose;
    }

    if (skipped) {
      delete this.dialogBack.hidden;
    } else {
      this.dialogBack.hidden = true;
    }
  },

  requestClose: function spl_requestClose(reason) {
    window.dispatchEvent(new CustomEvent('simpinrequestclose', {
      detail: {
        dialog: this,
        reason: reason
      }
    }));
  },

  close: function spl_close(reason) {
    window.dispatchEvent(new CustomEvent('simpinclose', {
      detail: this
    }));
    this.systemDialog.hide(reason);
  },

  skip: function spl_skip() {
    window.dispatchEvent(new CustomEvent('simpinskip', {
      detail: this
    }));
  },

  back: function spl_back() {
    window.dispatchEvent(new CustomEvent('simpinback', {
      detail: this
    }));
  },

  // With the keyboard active the inputs, ensure they get scrolled
  // into view
  ensureFocusInView: function spl_ensureInView(element, container) {
    element.addEventListener('focus', function(e) {
      window.addEventListener('system-resize', function resize() {
        window.removeEventListener('system-resize', resize);
        // The layout always has the input at the bottom, so
        // just always ensure we scroll to the bottom
        container.scrollTop = container.offsetHeight;
      });
    });
  },

  init: function spl_init() {
    this.systemDialog = SystemDialog('simpin-dialog', {
                                       onHide: this.onHide.bind(this)
                                     });

    if (!SIMSlotManager.length) {
      return;
    }

    this.dialogDone.onclick = this.verify.bind(this);
    this.dialogSkip.onclick = this.skip.bind(this);
    this.dialogBack.onclick = this.back.bind(this);
    this.pinInput = this.getNumberPasswordInputField('simpin');
    this.pukInput = this.getNumberPasswordInputField('simpuk');
    this.xckInput = this.getNumberPasswordInputField('xckpin');
    this.newPinInput = this.getNumberPasswordInputField('newSimpin');
    this.confirmPinInput = this.getNumberPasswordInputField('confirmNewSimpin');

    this.ensureFocusInView(this.pinInput, this.containerDiv);
    this.ensureFocusInView(this.pukInput, this.containerDiv);
  }
};

SimPinDialog.init();
