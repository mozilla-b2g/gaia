/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global getTruncated */
/* exported Pairview */

'use strict';

var Pairview = {
  /**
   * flag for debugging.
   */
  _debug: false,

  /**
   * remote device name to pair with.
   */
  _remoteDeviceName: null,

  /**
   * device authentication method
   */
  _pairMethod: null,

  /**
   * event handler of pairing request
   */
  _options: null,

  _passkey: '',

  pairview: document.getElementById('pair-view'),

  nameLabel: document.getElementById('label-name'),
  pairDescription: document.getElementById('pair-description'),
  pairButton: document.getElementById('button-pair'),
  closeButton: document.getElementById('button-close'),

  comfirmationItem: document.getElementById('confirmation-method'),
  pinInputItem: document.getElementById('pin-input-method'),

  passkey: document.getElementById('passkey'),
  pinInput: document.getElementById('pin-input'),

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

    this._remoteDeviceName = this._remoteDeviceName || _('unnamed-device');
    var truncatedDeviceName = getTruncated(this._remoteDeviceName, {
      node: this.nameLabel,
      maxLine: 2,
      ellipsisIndex: 3
    });

    this.nameLabel.textContent = truncatedDeviceName;
    this.pairview.hidden = false;

    // Since pairing process is migrated from Settings app to Bluetooth app,
    // there is no way to identify the pairing request in active/passive mode.
    // In order to let the pairing messsage consistency,
    // given the pairing mode to be passive.
    var stringName = 'passive-pair-' + this._pairMethod;
    this.pairDescription.textContent =
      _(stringName, {device: truncatedDeviceName});

    switch (this._pairMethod) {
      case 'displaypasskey':
      case 'confirmation':
        this.passkey.textContent = this._passkey;
        this.comfirmationItem.hidden = false;
        this.pinInputItem.hidden = true;
        break;
      case 'enterpincode':
        this.pinInputItem.hidden = false;
        this.comfirmationItem.hidden = true;
        this.pinInput.focus();
        break;
      case 'consent':
        this.comfirmationItem.hidden = false;
        this.pinInputItem.hidden = true;
        break;
    }
  },

  /**
   * It is used to init pairing information in this pair view.
   *
   * @memberOf Pairview
   * @access public
   * @param {String} method - method of this pairing request
   * @param {Object} options
   * @param {String} options.deviceName - name of the remote bluetooth device
   * @param {BluetoothPairingHandle} options.handle - property handle that
                                                      carries specific method
                                                      to reply by user.
   */
  init: function pv_init(method, options) {
    this._pairMethod = method;
    this._options = options;
    this._remoteDeviceName = options.deviceName;

    if (options.handle && options.handle.passkey) {
      var passkey = options.handle.passkey;
      var len = passkey.toString().length;
      var zeros = (len < 6) ? (new Array((6 - len) + 1)).join('0') : '';
      this._passkey = zeros + passkey;
    }

    // show() only until the page is localized.
    navigator.mozL10n.once(Pairview.show.bind(Pairview));
  },

  close: function pv_close() {
    // Since user clicked close button, we reject pairing request.
    // Because the reject() interface of pairing requests are same, we do same
    // operation here.
    this._options.handle.reject().then(() => {
      this.debug('Resolved in reject ' + this._pairMethod + ' request.');
      // Close window by self.
      window.close();
    }, (aReason) => {
      this.debug('Rejected in reject ' + this._pairMethod +
                 ' request with reason: ' + aReason);
      // Close window by self.
      window.close();
    });
  },

  closeInput: function pv_closeInput() {
    if (!this.pinInputItem.hidden) {
      this.pinInput.blur();
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
              case 'displaypasskey':
                // Do nothing here since the pairing method display passkey only
                // Close window by self.
                window.close();
                break;
              case 'enterpincode':
                var pinCode = this.pinInput.value;
                this._options.handle.setPinCode(pinCode).then(() => {
                  this.debug('Resolved setPinCode operation');
                  // Close window by self.
                  window.close();
                }, (aReason) => {
                  this.debug('Rejected setPinCode with reason: ' + aReason);
                  // Close window by self.
                  window.close();
                });
                break;
              case 'confirmation':
              case 'consent':
                this._options.handle.accept().then(() => {
                  this.debug('Resolved in ' + this._pairMethod + ' request');
                  // Close window by self.
                  window.close();
                }, (aReason) => {
                  this.debug('Rejected in ' + this._pairMethod + ' request ' +
                             ' with reason: ' + aReason);
                  // Close window by self.
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
  },

  debug: function(msg) {
    if (this._debug) {
      console.log('Pairview(): ' + msg);
    }
  }
};
