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

  pairView: document.getElementById('pair-view'),
  alertView: document.getElementById('alert-view'),

  title: document.getElementById('pair-title'),
  deviceInfo: document.getElementById('device-info'),
  nameLabel: document.getElementById('label-name'),
  addressLabel: document.getElementById('label-address'),
  pairDescription: document.getElementById('pair-description'),
  pairButton: document.getElementById('button-pair'),
  closeButton: document.getElementById('button-close'),
  okButton: document.getElementById('button-ok'),

  comfirmationItem: document.getElementById('confirmation-method'),
  pinInputItem: document.getElementById('pin-input-method'),
  passkeyInputItem: document.getElementById('passkey-input-method'),

  passkey: document.getElementById('passkey'),
  pinInput: document.getElementById('pin-input'),
  passkeyInput: document.getElementById('passkey-input'),

  init: function pv_init() {
    this.pairButton.addEventListener('click', this);
    this.closeButton.addEventListener('click', this);
    this.okButton.addEventListener('click', this);

    this.title.textContent = _(this._pairMode + '-pair');
    this.nameLabel.textContent = this._device.name;
    this.addressLabel.textContent = this._device.address;
    this.deviceInfo.className = this._device.icon;
    //XXX this.iconImage.src = device.icon
    this.pairView.hidden = false;
    this.alertView.hidden = true;

    var stringName = this._pairMode + '-pair-' + this._pairMethod;
    this.pairDescription.textContent =
      _(stringName, {device: this._device.name});

    switch (this._pairMethod) {
      case 'confirmation':
        this.passkey.textContent = this._passkey;
        this.comfirmationItem.hidden = false;
        this.pinInputItem.hidden = true;
        this.passkeyInputItem.hidden = true;
        break;

      case 'pincode':
        this.pinInputItem.hidden = false;
        this.comfirmationItem.hidden = true;
        this.passkeyInputItem.hidden = true;
        this.pinInput.focus();
        break;

      case 'passkey':
        this.passkeyInputItem.hidden = false;
        this.comfirmationItem.hidden = true;
        this.pinInputItem.hidden = true;
        this.passkeyInput.focus();
        break;
    }
  },

  setUp: function pv_setDeviceInfo(mode, method, device, passkey) {
    this._pairMode = mode;
    this._pairMethod = method;
    this._device = device;
    if (passkey) {
      var len = passkey.toString().length;
      var zeros = (len < 6) ? (new Array((6 - len) + 1)).join('0') : '';
      this._passkey = zeros + passkey;
    }
  },

  handleEvent: function pv_handleEvent(evt) {
    if (evt.type !== 'click' || !evt.target)
      return;

    evt.preventDefault();
    switch (evt.target.id) {
      case 'button-pair':
        this.pairDescription.textContent = _('device-status-waiting');
        this.pairButton.disabled = true;
        this.closeButton.disabled = true;
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
        break;

      case 'button-close':
      case 'button-ok':
        window.close();
        break;
    }
  },

  pairFailed: function pv_showFailed() {
    this.pairView.hidden = true;
    this.alertView.hidden = false;
  }
};

window.addEventListener('localized', function bluetoothSettings(evt) {
  PairView.init();
});
