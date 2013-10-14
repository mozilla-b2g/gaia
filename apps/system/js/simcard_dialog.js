/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SimPinDialog = {
  dialogTitle: document.querySelector('#simpin-dialog header h1'),
  dialogDone: document.querySelector('#simpin-dialog button[type="submit"]'),
  dialogClose: document.querySelector('#simpin-dialog button[type="reset"]'),

  pinArea: document.getElementById('pinArea'),
  pukArea: document.getElementById('pukArea'),
  xckArea: document.getElementById('xckArea'),
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

  mobileConnection: null,

  lockType: 'pin',
  action: 'unlock',

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
      if (evt.target !== inputField)
        return;

      checkDialogDone();
    });

    inputField.addEventListener('focus', function() {
      checkDialogDone();
    });

    function checkDialogDone() {
      if (inputField.value.length >= 4)
        self.dialogDone.disabled = false;
      else
        self.dialogDone.disabled = true;
    }


    return inputField;
  },

  handleCardState: function spl_handleCardState() {
    var _ = navigator.mozL10n.get;

    var cardState = IccHelper.cardState;
    var lockType = this.lockTypeMap[cardState];
    IccHelper.getCardLockRetryCount(lockType, (function(retryCount) {
      if (retryCount) {
        var l10nArgs = { n: retryCount };
        this.triesLeftMsg.textContent = _('inputCodeRetriesLeft', l10nArgs);
        this.triesLeftMsg.hidden = false;
      }
    }).bind(this));

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
        var desc = this.xckArea.querySelector('div[name="xckDesc"]');
        desc.textContent = _(lockType + 'Code');
        this.xckInput.focus();
        break;
      default:
        this.skip();
        break;
    }
    this.dialogTitle.textContent = _(this.lockType + 'Title') || '';
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
    if (pin === '')
      return;

    var options = {lockType: 'pin', pin: pin };
    this.unlockCardLock(options);
    this.clear();
  },

  unlockPuk: function spl_unlockPuk() {
    var _ = navigator.mozL10n.get;

    var puk = this.pukInput.value;
    var newPin = this.newPinInput.value;
    var confirmPin = this.confirmPinInput.value;
    if (puk === '' || newPin === '' || confirmPin === '')
      return;

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
    if (xck === '')
      return;

    var options = {lockType: this.lockType, pin: xck };
    this.unlockCardLock(options);
    this.clear();
  },

  unlockCardLock: function spl_unlockCardLock(options) {
    var req = IccHelper.unlockCardLock(options);
    req.onsuccess = this.close.bind(this, 'success');
    req.onerror = (function spl_unlockCardLockError() {
      this.handleError(req.error);
    }).bind(this);
  },

  enableLock: function spl_enableLock() {
    var pin = this.pinInput.value;
    if (pin === '')
      return;

    var enabled = SimPinLock.simPinCheckBox.checked;
    var options = {lockType: 'pin', pin: pin, enabled: enabled};
    this.setCardLock(options);
    this.clear();
  },

  changePin: function spl_changePin() {
    var _ = navigator.mozL10n.get;

    var pin = this.pinInput.value;
    var newPin = this.newPinInput.value;
    var confirmPin = this.confirmPinInput.value;
    if (pin === '' || newPin === '' || confirmPin === '')
      return;

    if (newPin !== confirmPin) {
      this.errorMsgHeader.textContent = _('newPinErrorMsg');
      this.errorMsgBody.textContent = '';
      this.errorMsg.hidden = false;
      return;
    }
    var options = {lockType: 'pin', pin: pin, newPin: newPin};
    this.setCardLock(options);
    this.clear();
  },

  setCardLock: function spl_setCardLock(options) {
    var req = IccHelper.setCardLock(options);
    req.onsuccess = this.close.bind(this, 'success');
  },
  inputFieldControl: function spl_inputField(isPin, isPuk, isXck, isNewPin) {
    this.pinArea.hidden = !isPin;
    this.pukArea.hidden = !isPuk;
    this.xckArea.hidden = !isXck;
    this.newPinArea.hidden = !isNewPin;
    this.confirmPinArea.hidden = !isNewPin;
  },

  verify: function spl_verify() {
    switch (this.action) {
      case 'unlock':
        if (this.lockType === 'pin')
          this.unlockPin();
        else if (this.lockType === 'puk') {
          this.unlockPuk();
        } else {
          this.unlockXck();
        }
        break;
      case 'enable':
        this.enableLock();
        break;
      case 'changePin':
        this.changePin();
        break;
    }
    return false;
  },

  onHide: function spl_onHide(reason) {
    this.clear();
    if (this.onclose)
      this.onclose(reason);
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
   * @param {String}   action  Name of the action to execute,
   *                           either: unlock, enable or changePin.
   * @param {Function} title   Optional function called when dialog is closed.
   *                           Receive a single argument being the reason of
   *                           dialog closing: success, skip, home or holdhome.
   */
  show: function spl_show(action, onclose) {
    var _ = navigator.mozL10n.get;

    // Hide the utility tray to avoid overlapping the SIM Pin dialog
    UtilityTray.hide(true);

    this.systemDialog.show();
    this.action = action;
    this.lockType = 'pin';
    switch (action) {
      case 'unlock':
        this.handleCardState();
        break;
      case 'enable':
        this.inputFieldControl(true, false, false, false);
        this.dialogTitle.textContent = _('pinTitle') || '';
        break;
      case 'changePin':
        this.inputFieldControl(true, false, false, true);
        this.dialogTitle.textContent = _('newpinTitle') || '';
        break;
    }

    if (onclose && typeof onclose === 'function')
      this.onclose = onclose;
  },

  close: function spl_close(reason) {
    this.systemDialog.hide(reason);
  },

  skip: function spl_skip() {
    this.close('skip');
    return false;
  },

  init: function spl_init() {
    this.systemDialog = SystemDialog('simpin-dialog', {
                                       onHide: this.onHide.bind(this)
                                     });

    this.mobileConnection = window.navigator.mozMobileConnection;
    if (!this.mobileConnection)
      return;

    if (!IccHelper.enabled)
      return;

    this.dialogDone.onclick = this.verify.bind(this);
    this.dialogClose.onclick = this.skip.bind(this);
    this.pinInput = this.getNumberPasswordInputField('simpin');
    this.pukInput = this.getNumberPasswordInputField('simpuk');
    this.xckInput = this.getNumberPasswordInputField('xckpin');
    this.newPinInput = this.getNumberPasswordInputField('newSimpin');
    this.confirmPinInput = this.getNumberPasswordInputField('confirmNewSimpin');
  }
};

SimPinDialog.init();

