/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
/* global BluetoothHelper, PairManager */

'use strict';

(function(exports) {

  var _ = window.navigator.mozL10n.get;
  var _debug = false;

  /*
   * PairManager is responsible for:
   *   1. Handling system message 'bluetooth-pairing-request' while there is an
   *      incoming/outgoing pairing request.
   *   2. handling system message 'bluetooth-cancel' while some remote devices
   *      request for canceling an overdue pairing request. The reason could be
   *      cancel from remote devices, timeout, or other..w
   */
  var PairManager = {
    init: function() {
      // require mozBluetooth from BluetoothHelper
      this.bluetoothHelper = BluetoothHelper();

      navigator.mozSetMessageHandler('bluetooth-pairing-request',
        this.onRequestPairing.bind(this)
      );

      navigator.mozSetMessageHandler('bluetooth-cancel',
        this.onBluetoothCancel.bind(this)
      );
    },

    onRequestPairing: function(message) {
      this.debug('onRequestPairing(): message = ' + message);

      var req = navigator.mozSettings.createLock().get('lockscreen.locked');
      var self = this;
      req.onsuccess = function bt_onGetLocksuccess() {
        if (!req.result['lockscreen.locked']) {
          self.showPairview(message);
        }
      };
      req.onerror = function bt_onGetLockError() {
        // fallback to default value 'unlocked'
        self.showPairview(message);
      };
    },

    showPairview: function(pairingInfo) {
      this.debug('showPairview(): pairingInfo = ' + pairingInfo);

      var evt = pairingInfo;
      var device = {
        address: evt.address,
        name: evt.name || _('unnamed-device'),
        icon: evt.icon || 'bluetooth-default'
      };

      // Since pairing process is migrated from Settings app to Bluetooth app,
      // there is no way to identify the pairing request in active/passive mode.
      // In order to let the pairing messsage consistency,
      // given the pairing mode to be passive.
      var pairingMode = 'passive';

      var passkey = evt.passkey || null;
      var method = evt.method;
      var protocol = window.location.protocol;
      var host = window.location.host;
      this.childWindow = window.open(protocol + '//' + host + '/onpair.html',
                  'pair_screen', 'attention');
      var self = this;
      this.childWindow.onload = function childWindowLoaded() {
        self.childWindow.Pairview.init(pairingMode, method, device, passkey);
      };
    },

    onBluetoothCancel: function(message) {
      this.debug('onBluetoothCancel(): event message = ' + message);

      // if the attention screen still open, close it
      if (this.childWindow) {
        this.childWindow.Pairview.closeInput();
        this.childWindow.close();
      }
    },

    setConfirmation: function(address, confirmed) {
      this.bluetoothHelper.setPairingConfirmation(address, confirmed);
      window.close();
    },

    setPinCode: function(address, pincode) {
      this.bluetoothHelper.setPinCode(address, pincode);
      window.close();
    },

    setPasskey: function(address, passkey) {
      var key = parseInt(passkey, 10);
      this.bluetoothHelper.setPasskey(address, key);
      window.close();
    },

    debug: function(msg) {
      if (_debug) {
        console.log('PairManager(): ' + msg);
      }
    }
  };

  exports.PairManager = PairManager;

})(window);

navigator.mozL10n.once(PairManager.init.bind(PairManager));
