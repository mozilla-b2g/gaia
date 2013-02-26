/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SimPinDialog = {
  dialogTitle: document.querySelector('#simpin-dialog header h1'),
  dialogDone: document.querySelector('#simpin-dialog button[type="submit"]'),
  dialogClose: document.querySelector('#simpin-dialog button[type="reset"]'),

  pinArea: document.getElementById('pinArea'),
  pukArea: document.getElementById('pukArea'),
  nckArea: document.getElementById('nckArea'),
  newPinArea: document.getElementById('newPinArea'),
  confirmPinArea: document.getElementById('confirmPinArea'),

  pinInput: null,
  pukInput: null,
  nckInput: null,
  newPinInput: null,
  confirmPinInput: null,

  errorMsg: document.getElementById('errorMsg'),
  errorMsgHeader: document.getElementById('messageHeader'),
  errorMsgBody: document.getElementById('messageBody'),

  mobileConnection: null,

  lockType: 'pin',
  action: 'unlock',

  visibleOKbtn: true,	       // Bug834205_OK button status after lockscreen
  // Now we don't have a number-password type for input field
  // mimic one by binding one number input and one text input
  getNumberPasswordInputField: function spl_wrapNumberInput(name) {
    var valueEntered = '';
    var inputField = document.querySelector('input[name="' + name + '"]');
    var displayField = document.querySelector('input[name="' + name + 'Vis"]');
    var codeMaxLength = parseInt(inputField.getAttribute('maxlength'), 10);
    var self = this;

    inputField.addEventListener('keypress', function(evt) {
      if (evt.target !== inputField)
        return;
      evt.preventDefault();

      var code = evt.charCode;
      if (code !== 0 && (code < 0x30 || code > 0x39))
        return;

      if (code === 0) { // backspace
        valueEntered = valueEntered.substr(0, valueEntered.length - 1);
      } else {
        if (valueEntered.length >= codeMaxLength)
          return;
        valueEntered += String.fromCharCode(code);
      }
      displayField.value = encryption(valueEntered);
      if (displayField.value.length >= 4)
        self.dialogDone.disabled = false;
      else
        self.dialogDone.disabled = true;

       // Bug834205_OK button status after lockscreen
       self.visibleOKbtn = self.dialogDone.disabled;
	   
    });

    function encryption(str) {
      return (new Array(str.length + 1)).join('*');
    }

    function setValue(value) {
      valueEntered = value;
      inputField.value = value;
      displayField.value = encryption(valueEntered);
    }

    function setFocus() {
      inputField.focus();
    }

    function blur() {
      inputField.blur();
    }

    return {
      get value() { return valueEntered; },
      set value(value) { setValue(value) },
      focus: setFocus,
      blur: blur
    };
  },

  handleCardState: function spl_handleCardState() {
    var _ = navigator.mozL10n.get;

    var cardState = this.mobileConnection.cardState;
    switch (cardState) {
      case 'pinRequired':
        this.lockType = 'pin';
        this.errorMsg.hidden = true;
        this.inputFieldControl(true, false, false, false);
        this.pinInput.focus();
        break;
      case 'pukRequired':
        this.lockType = 'puk';
        this.errorMsgHeader.textContent = _('simCardLockedMsg') || '';
        this.errorMsgHeader.dataset.l10nId = 'simCardLockedMsg';
        this.errorMsgBody.textContent = _('enterPukMsg') || '';
        this.errorMsgBody.dataset.l10nId = 'enterPukMsg';
        this.errorMsg.hidden = false;
        this.inputFieldControl(false, true, false, true);
        this.pukInput.focus();
        break;
      case 'networkLocked':
        this.lockType = 'nck';
        this.errorMsg.hidden = true;
        this.inputFieldControl(false, false, true, false);
        this.nckInput.focus();
        break;
      default:
        this.skip();
        break;
    }
    this.dialogTitle.textContent = _(this.lockType + 'Title') || '';
    this.dialogTitle.dataset.l10nId = this.lockType + 'Title';
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
      this.nckInput.focus();
    }
  },

  showErrorMsg: function spl_showErrorMsg(retry, type) {
    var _ = navigator.mozL10n.get;

    this.errorMsgHeader.textContent = _(type + 'ErrorMsg');
    this.errorMsgHeader.dataset.l10nId = type + 'ErrorMsg';

    if (retry !== 1) {
      var l10nArgs = { n: retry };
      this.errorMsgBody.dataset.l10nId = type + 'AttemptMsg';
      this.errorMsgBody.dataset.l10nArgs = JSON.stringify(l10nArgs);
      this.errorMsgBody.textContent = _(type + 'AttemptMsg', l10nArgs);
    } else {
      this.errorMsgBody.dataset.l10nId = type + 'LastChanceMsg';
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
      this.errorMsgHeader.dataset.l10nId = 'newPinErrorMsg';
      this.errorMsgBody.textContent = '';
      this.errorMsg.hidden = false;
      return;
    }
    var options = {lockType: 'puk', puk: puk, newPin: newPin };
    this.unlockCardLock(options);
    this.clear();
  },

  unlockNck: function spl_unlockNck() {
    var nck = this.nckInput.value;
    if (nck === '')
      return;

    var options = {lockType: 'nck', pin: nck };
    this.unlockCardLock(options);
    this.clear();
  },

  unlockCardLock: function spl_unlockCardLock(options) {
    var req = this.mobileConnection.unlockCardLock(options);
    req.onsuccess = this.close.bind(this, 'success');
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
      this.errorMsgHeader.dataset.l10nId = 'newPinErrorMsg';
      this.errorMsgBody.textContent = '';
      this.errorMsg.hidden = false;
      return;
    }
    var options = {lockType: 'pin', pin: pin, newPin: newPin};
    this.setCardLock(options);
    this.clear();
  },

  setCardLock: function spl_setCardLock(options) {
    var req = this.mobileConnection.setCardLock(options);
    req.onsuccess = this.close.bind(this, 'success');
  },
  inputFieldControl: function spl_inputField(isPin, isPuk, isNck, isNewPin) {
    this.pinArea.hidden = !isPin;
    this.pukArea.hidden = !isPuk;
    this.nckArea.hidden = !isNck;
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
          this.unlockNck();
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
    this.newPinInput.value = '';
    this.confirmPinInput.value = '';
  },

   // Bug834205_OK button status after lockscreen
  resetOKbtn: function spl_resetOKbtn(){
    this.visibleOKbtn = this.dialogDone.disabled = true;
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

    this.systemDialog.show();
	
    // Bug834205_OK button status after lockscreen
    if(this.visibleOKbtn != this.dialogDone.disabled)
    {
	this.dialogDone.disabled = this.visibleOKbtn;
    }

    this.action = action;
    this.lockType = 'pin';
    switch (action) {
      case 'unlock':
        this.handleCardState();
        break;
      case 'enable':
        this.inputFieldControl(true, false, false, false);
        this.dialogTitle.textContent = _('pinTitle') || '';
        this.dialogTitle.dataset.l10nId = 'pinTitle';
        break;
      case 'changePin':
        this.inputFieldControl(true, false, false, true);
        this.dialogTitle.textContent = _('newpinTitle') || '';
        this.dialogTitle.dataset.l10nId = 'newpinTitle';
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

    this.mobileConnection.addEventListener('icccardlockerror',
      this.handleError.bind(this));

    this.dialogDone.onclick = this.verify.bind(this);
    this.dialogClose.onclick = this.skip.bind(this);
    this.pinInput = this.getNumberPasswordInputField('simpin');
    this.pukInput = this.getNumberPasswordInputField('simpuk');
    this.nckInput = this.getNumberPasswordInputField('nckpin');
    this.newPinInput = this.getNumberPasswordInputField('newSimpin');
    this.confirmPinInput = this.getNumberPasswordInputField('confirmNewSimpin');

    // Bug834205_OK button status after lockscreen
    this.visibleOKbtn = this.dialogDone.disabled = true;
    window.addEventListener('screenchange', function(){
        this.visibleOKbtn = this.dialogDone.disabled;
    }); 
  }
};

SimPinDialog.init();

