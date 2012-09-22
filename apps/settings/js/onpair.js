/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var _ = navigator.mozL10n.get;

var PairView = {
  /**
   * device to pair with.
   */
  _device: null,

  /**
   * device authentication method
   */
  _pairMethod: null,

  _pairMode: 'active',

  _passkey: '',

  title: document.getElementById('pair-title'),
  nameLabel: document.getElementById('label-name'),
  addressLabel: document.getElementById('label-address'),
  pairDescription: document.getElementById('pair-description'),
  pairButton: document.getElementById('button-pair'),
  closeButton: document.getElementById('button-close'),

  comfirmationItem: document.getElementById('confirmation-method'),
  pinInputItem: document.getElementById('pin-input-method'),
  passkeyInputItem: document.getElementById('passkey-input-method'),

  passkey: document.getElementById('passkey'),
  pinInput: document.getElementById('pin-input'),
  passkeyInput: document.getElementById('passkey-input'),

  init: function pv_init() {
    this.pairButton.addEventListener('click', this);
    this.closeButton.addEventListener('click', this);

    this.title.textContent = _(this._pairMode+'-pair');
    this.nameLabel.textContent = this._device.name;
    this.addressLabel.textContent = this._device.address;
    //XXX this.iconImage.src = device.icon

    switch (this._pairMethod) {
      case 'confirmation':
        this.pairDescription.textContent = 
          _(this._pairMode+'-pair-confirmation', {device: this._device.name});
        this.passkey.textContent = this._passkey;
        this.pinInputItem.hidden = true;
        this.passkeyInputItem.hidden = true;
        break;

      case 'pincode':
        /**
         * XXX hard-coded here because attention screen
         *     doesn't support keyboard input now.
         * https://github.com/mozilla-b2g/gaia/issues/4669
         */
        this.pinInput.value = '0000';
        this.pinInput.focus();
        this.comfirmationItem.hidden = true;
        this.passkeyInputItem.hidden = true;
        break;

      case 'passkey':
        this.passkeyInput.focus();
        this.comfirmationItem.hidden = true;
        this.pinInputItem.hidden = true;
        break;
    }
  },

  setUp: function pv_setDeviceInfo(mode, method, device, passkey) {
    this._pairMode = mode;
    this._pairMethod = method;
    this._device = device;
    if (passkey)
      this._passkey = passkey;
  },

  handleEvent: function pv_handleEvent(evt) {
    if (evt.type !== 'click' || !evt.target)
      return;

    evt.preventDefault();
    switch (evt.target.id) {
      case 'button-pair':
        switch (this._pairMethod) {
          case 'confirmation':
            window.opener.gDeviceList.setConfirmation(this._device.address);
            break;
          case 'pincode':
            var value = this.pinInput.value;
            window.opener.gDeviceList.setPinCode(this._device.address, value);
            break;
          case 'passkey':
            var value = this.passkeyInput.value;
            window.opener.gDeviceList.setPasskey(this._device.address, value);
            break;
        }
//        window.close();
        break;

      case 'button-close':
        window.close();
        break;
    }
  },

  pairFailed: function pv_showFailed() {
    dump("==== in child window: pair failed");
    this.title.textContent = _('error-pair-title');
    this.pairDescription.textContent = _('error-pair-pincode'); 
    this.pairButton.disabled = true;
  }
};

window.addEventListener('localized', function bluetoothSettings(evt) {
  PairView.init();
});
