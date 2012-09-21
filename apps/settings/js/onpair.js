'use strict';

var PairView = {
  /*
     address of device to pair with.
   */
  _address: null,
  /*
     device authentication method
   */
  _pairMethod: null,

  nameLabel: document.getElementById('label-name'),
  addressLabel: document.getElementById('label-address'),
  pairButton: document.getElementById('button-pair'),
  closeButton: document.getElementById('button-close'),
  comfirmationItem: document.getElementById('confirmation-method'),
  pinInputItem: document.getElementById('pin-input-method'),
  passkeyInputItem: document.getElementById('passkey-input-method'),
  passkey: document.getElementById('passkey'),
  pinInput: document.getElementById('pin-input'),
  passkeyInput: document.getElementById('passkey-input'),

  init: function pv_setDeviceInfo(method, device, passkey) {
    this._pairMethod = method;
    this._address = device.address;
    this.nameLabel.textContent = device.name;
    this.addressLabel.textContent = device.address;

    this.pairButton.addEventListener('click', this);
    this.closeButton.addEventListener('click', this);

    switch (this._pairMethod) {
      case 'confirmation':
        this.passkey.textContent = passkey;
        this.pinInputItem.hidden = true;
        this.passkeyInputItem.hidden = true;
        break;

      case 'pincode':
        // XXX hard code here because attention screen
        // doesn't support keyboard input now.
        // https://github.com/mozilla-b2g/gaia/issues/4669
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

  handleEvent: function pv_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        var input = evt.target;
        dump("==== input.id event in "+input.id);
        if (!input)
          return;

        evt.preventDefault();
        switch (input.id) {
          case 'button-pair':
            dump("==== inner pair method "+this._pairMethod);
            switch (this._pairMethod) {
              case 'confirmation':
                dump("==== inner pair address "+this._address);
                window.opener.gDeviceList.setPairingConfirmation(this._address);
                break;
              case 'pincode':
                var value = this.pinInput.value;
                window.opener.gDeviceList.setPinCode(this._address, value);
                break;
              case 'passkey':
                var value = this.passkeyInput.value;
                window.opener.gDeviceList.setPasskey(this._address, value);
                break;
            }
            dump("==== going to close this window");
            window.close();
            break;

          case 'button-close':
            dump("==== input.id close"+input.id);
            window.close();
            break;
        }
        break;
    }
  }

};

