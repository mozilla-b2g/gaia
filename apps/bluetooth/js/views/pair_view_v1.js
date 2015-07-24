/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global getTruncated */
/* exported Pairview */

'use strict';

var Pairview = {
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

  pairview: document.getElementById('pair-view'),

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

  get isFullAttentionMode() {
    return (window.innerHeight > 200);
  },

  show: function pv_show() {
    if (!this.isFullAttentionMode) {
      this.close();
      return;
    }

    var _ = navigator.mozL10n.get;
    this.pairButton.addEventListener('click', this);
    this.closeButton.addEventListener('click', this);
    window.addEventListener('resize', this);

    var truncatedDeviceName = getTruncated(_(this._device.name), {
      node: this.nameLabel,
      maxLine: 2,
      ellipsisIndex: 3
    });

    this.nameLabel.textContent = truncatedDeviceName;
    this.pairview.hidden = false;

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
    navigator.mozL10n.once(Pairview.show.bind(Pairview));
  },

  close: function pv_close() {
    window.opener.require(['modules/pair_manager_v1'], (PairManager) => {
      PairManager.setConfirmation(this._device.address, false);
      window.close();
    });
  },

  closeInput: function pv_closeInput() {
    if (!this.pinInputItem.hidden) {
      this.pinInput.blur();
    }
    if (!this.passkeyInputItem.hidden) {
      this.passkeyInput.blur();
    }
  },

  handleEvent: function pv_handleEvent(evt) {
    var _ = navigator.mozL10n.get;
    if (!evt.target) {
      return;
    }

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
                window.opener.require(['modules/pair_manager_v1'], 
                  (PairManager) => {
                  PairManager.setConfirmation(this._device.address, true);
                  window.close();
                });
                break;
              case 'pincode':
                var pinValue = this.pinInput.value;
                window.opener.require(['modules/pair_manager_v1'], 
                  (PairManager) => {
                  PairManager.setPinCode(this._device.address, pinValue);
                  window.close();
                });
                break;
              case 'passkey':
                var passkeyValue = this.passkeyInput.value;
                window.opener.require(['modules/pair_manager_v1'], 
                  (PairManager) => {
                  PairManager.setPasskey(this._device.address, passkeyValue);
                  window.close();
                });
                break;
            }
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
        if (!this.isFullAttentionMode) {
          this.close();
        }
        break;

      default:
        break;
    }
  }
};
