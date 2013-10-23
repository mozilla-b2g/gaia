/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';


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

  nameLabel: document.getElementById('label-name'),
  pairDescription: document.getElementById('pair-description'),
  pairButton: document.getElementById('button-pair'),
  closeButton: document.getElementById('button-close'),

  comfirmationItem: document.getElementById('confirmation-method'),
  pinInputItem: document.getElementById('pin-input-method'),
  passkeyInputItem: document.getElementById('passkey-input-method'),

  passkey: document.getElementById('passkey'),
  pinInput: document.getElementById('pin-input'),
  passkeyInput: document.getElementById('passkey-input'),

  show: function pv_show() {
    var _ = navigator.mozL10n.get;
    this.pairButton.addEventListener('click', this);
    this.closeButton.addEventListener('click', this);
    window.addEventListener('resize', this);

    var truncatedDeviceName = getTruncated(this._device.name, {
      node: this.nameLabel,
      maxLine: 2,
      ellipsisIndex: 3
    });

    this.nameLabel.textContent = truncatedDeviceName;
    this.pairView.hidden = false;

    var stringName = this._pairMode + '-pair-' + this._pairMethod;
    this.pairDescription.textContent =
      _(stringName, {device: truncatedDeviceName});

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

  init: function pv_init(mode, method, device, passkey) {
    this._pairMode = mode;
    this._pairMethod = method;
    this._device = device;
    if (passkey) {
      var len = passkey.toString().length;
      var zeros = (len < 6) ? (new Array((6 - len) + 1)).join('0') : '';
      this._passkey = zeros + passkey;
    }

    // show() only until the page is localized.
    navigator.mozL10n.ready(PairView.show.bind(PairView));
  },

  close: function() {
    window.opener.gDeviceList.setConfirmation(this._device.address, false);
    window.close();
  },

  closeInput: function() {
    if (!this.pinInputItem.hidden) {
      this.pinInput.blur();
    }
    if (!this.passkeyInputItem.hidden) {
      this.passkeyInput.blur();
    }
  },

  handleEvent: function pv_handleEvent(evt) {
    var _ = navigator.mozL10n.get;
    if (!evt.target)
      return;

    switch (evt.type) {
      case 'click':
        evt.preventDefault();
        switch (evt.target.id) {
          case 'button-pair':
            this.pairDescription.textContent = _('device-status-waiting');
            this.pairButton.disabled = true;
            this.closeButton.disabled = true;
            switch (this._pairMethod) {
              case 'confirmation':
                window.opener.gDeviceList.
                  setConfirmation(this._device.address, true);
                break;
              case 'pincode':
                var value = this.pinInput.value;
                window.opener.gDeviceList.setPinCode(this._device.address,
                  value);
                break;
              case 'passkey':
                var value = this.passkeyInput.value;
                window.opener.gDeviceList.setPasskey(this._device.address,
                  value);
                break;
            }
            window.close();
            break;
          case 'button-close':
            this.close();
            break;
        }
        break;
      case 'resize':
      // XXX: this is hack that we have to close the attention in this case,
      // while in most other cases, we would just change it into an active
      // status bar
        if (window.innerHeight < 200) {
          this.close();
        }
        break;

      default:
        break;
    }
  }
};

