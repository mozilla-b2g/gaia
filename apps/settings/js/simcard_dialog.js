/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SimPinDialog = {
  dialog: document.getElementById('simpin-dialog'),
  dialogTitle: document.querySelector('#simpin-dialog header h1'),
  dialogDone: document.querySelector('#simpin-dialog button[type="submit"]'),
  dialogClose: document.querySelector('#simpin-dialog button[type="reset"]'),

  pinArea: document.getElementById('pinArea'),
  pukArea: document.getElementById('pukArea'),
  newPinArea: document.getElementById('newPinArea'),
  confirmPinArea: document.getElementById('confirmPinArea'),

  pinInput: null,
  pukInput: null,
  newPinInput: null,
  confirmPinInput: null,

  triesLeftMsg: document.getElementById('triesLeft'),

  errorMsg: document.getElementById('errorMsg'),
  errorMsgHeader: document.getElementById('messageHeader'),
  errorMsgBody: document.getElementById('messageBody'),

  mobileConnection: null,

  lockType: 'pin',
  action: 'unlock',
  origin: null,

  getNumberPasswordInputField: function spl_wrapNumberInput(name) {
    var inputField = document.querySelector('input[name="' + name + '"]');
    var self = this;

    inputField.addEventListener('input', function(evt) {
      if (evt.target !== inputField)
        return;

      if (inputField.value.length >= 4)
        self.dialogDone.disabled = false;
      else
        self.dialogDone.disabled = true;
    });

    return inputField;
  },

  handleCardState: function spl_handleCardState() {
    var _ = navigator.mozL10n.get;

    var cardState = IccHelper.cardState;
    switch (cardState) {
      case 'pinRequired':
        this.lockType = 'pin';
        this.errorMsg.hidden = true;
        this.inputFieldControl(true, false, false);
        this.pinInput.focus();
        break;
      case 'pukRequired':
        this.lockType = 'puk';
        this.errorMsgHeader.textContent = _('simCardLockedMsg') || '';
        this.errorMsgBody.textContent = _('enterPukMsg') || '';
        this.errorMsg.hidden = false;
        this.inputFieldControl(false, true, true);
        this.pukInput.focus();
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
    if (evt.lockType === 'pin')
      this.pinInput.focus();
    else
      this.pukInput.focus();
  },

  showErrorMsg: function spl_showErrorMsg(retry, type) {
    var _ = navigator.mozL10n.get;
    var l10nArgs = { n: retry };

    this.triesLeftMsg.textContent = _('inputCodeRetriesLeft', l10nArgs);
    this.errorMsgHeader.textContent = _(type + 'ErrorMsg');
    if (retry !== 1) {
      this.errorMsgBody.textContent = _(type + 'AttemptMsg3', l10nArgs);
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
      this.newPinInput.value = '';
      this.confirmPinInput.value = '';
      return;
    }
    var options = {lockType: 'puk', puk: puk, newPin: newPin };
    this.unlockCardLock(options);
    this.clear();
  },

  unlockCardLock: function spl_unlockCardLock(options) {
    var self = this;
    var req = IccHelper.unlockCardLock(options);
    req.onsuccess = function sp_unlockSuccess() {
      self.close();
      if (self.onsuccess)
        self.onsuccess();
    };
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
      this.newPinInput.value = '';
      this.confirmPinInput.value = '';
      return;
    }
    var options = {lockType: 'pin', pin: pin, newPin: newPin};
    this.setCardLock(options);
    this.clear();
  },

  setCardLock: function spl_setCardLock(options) {
    var self = this;
    var req = IccHelper.setCardLock(options);
    req.onsuccess = function spl_enableSuccess() {
      self.close();
      if (self.onsuccess)
        self.onsuccess();
    };
  },
  inputFieldControl: function spl_inputField(isPin,  isPuk, isNewPin) {
    this.pinArea.hidden = !isPin;
    this.pukArea.hidden = !isPuk;
    this.newPinArea.hidden = !isNewPin;
    this.confirmPinArea.hidden = !isNewPin;
  },

  verify: function spl_verify() {
    switch (this.action) {
      case 'unlock':
        if (this.lockType === 'pin')
          this.unlockPin();
        else {
          this.unlockPuk();
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


  clear: function spl_clear() {
    this.errorMsg.hidden = true;
    this.pinInput.value = '';
    this.pukInput.value = '';
    this.newPinInput.value = '';
    this.confirmPinInput.value = '';
  },

  onsuccess: null,
  oncancel: null,
  // the origin parameter records the dialog caller.
  // when the dialog is closed, we can relocate back to the caller's div.
  show: function spl_show(action, onsuccess, oncancel, origin) {
    if ('#simpin-dialog' == Settings.currentPanel)
      return;

    var _ = navigator.mozL10n.get;

    this.dialogDone.disabled = true;
    this.action = action;
    this.lockType = 'pin';
    switch (action) {
      case 'unlock':
        this.handleCardState();
        break;
      case 'enable':
        this.inputFieldControl(true, false, false);
        this.dialogTitle.textContent = _('pinTitle') || '';
        break;
      case 'changePin':
        this.inputFieldControl(true, false, true);
        this.dialogTitle.textContent = _('newpinTitle') || '';
        break;
    }

    IccHelper.getCardLockRetryCount(this.lockType, (function(retryCount) {
      if (!retryCount) {
        this.triesLeftMsg.hidden = true;
      } else {
        var l10nArgs = { n: retryCount };
        this.triesLeftMsg.textContent = _('inputCodeRetriesLeft', l10nArgs);
        this.triesLeftMsg.hidden = false;
      }
    }).bind(this));

    if (onsuccess && typeof onsuccess === 'function')
      this.onsuccess = onsuccess;
    if (oncancel && typeof oncancel === 'function')
      this.oncancel = oncancel;

    this.origin = origin;
    Settings.currentPanel = '#simpin-dialog';

    if (action === 'unlock' && this.lockType === 'puk')
      this.pukInput.focus();
    else
      this.pinInput.focus();

  },

  close: function spl_close() {
    this.clear();
    if (this.origin)
      Settings.currentPanel = this.origin;
  },

  skip: function spl_skip() {
    this.close();
    if (this.oncancel)
      this.oncancel();

    return false;
  },

  init: function spl_init() {
    this.mobileConnection = window.navigator.mozMobileConnection;
    if (!this.mobileConnection)
      return;

    if (!IccHelper.enabled)
      return;

    IccHelper.addEventListener('icccardlockerror',
      this.handleError.bind(this));

    this.dialogDone.onclick = this.verify.bind(this);
    this.dialogClose.onclick = this.skip.bind(this);

    this.pinInput = this.getNumberPasswordInputField('simpin');
    this.pukInput = this.getNumberPasswordInputField('simpuk');
    this.newPinInput = this.getNumberPasswordInputField('newSimpin');
    this.confirmPinInput = this.getNumberPasswordInputField('confirmNewSimpin');
  }
};

SimPinDialog.init();

