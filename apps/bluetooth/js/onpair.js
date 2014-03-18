/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
var gDeviceList = null;
'use strict';

navigator.mozL10n.ready(function showPanel() {
  console.log('--> showPanel():..');
  console.log('--> showPanel():..');
  console.log('--> showPanel():..');
  console.log('--> showPanel():..');
  var _ = navigator.mozL10n.get;
  var settings = window.navigator.mozSettings;
  var bluetooth = window.navigator.mozBluetooth;
  var defaultAdapter = null;

  function initialDefaultAdapter(callback) {
    if (!bluetooth.enabled) {
      return;
    }

    var req = bluetooth.getDefaultAdapter();
    req.onsuccess = function bt_getAdapterSuccess() {
      defaultAdapter = req.result;
      if (defaultAdapter == null) {
        console.log('--> connot get default adapter!!!');
        return;
      }

      // device list
      gDeviceList = (function deviceList() {
        function setConfirmation(address, confirmed) {
          if (!bluetooth.enabled || !defaultAdapter)
            return;

          // userCanceledPairing = !confirmed;
          /*
           * Only clear pairingAddress when in passive mode as pairingAddress is
           * used in the onerror function when in active mode.
           */
          // if (pairingMode === 'passive' && userCanceledPairing) {
            // pairingAddress = null;
          // }
          defaultAdapter.setPairingConfirmation(address, confirmed);
        }

        function setPinCode(address, pincode) {
          if (!bluetooth.enabled || !defaultAdapter)
            return;
          defaultAdapter.setPinCode(address, pincode);
        }

        function setPasskey(address, passkey) {
          if (!bluetooth.enabled || !defaultAdapter)
            return;
          var key = parseInt(passkey, 10);
          defaultAdapter.setPasskey(address, key);
        }

        // API
        return {
          setConfirmation: setConfirmation,
          setPinCode: setPinCode,
          setPasskey: setPasskey
        };

      })();

      if (callback) {
        callback();
      }
    };

    req.onerror = function bt_getAdapterFailed() {
      console.log('--> connot get default adapter!!!');
    };
  }

  function onRequestPairing(message) {
    console.log('--> onRequestPairing(): message = ' + message);
    var evt = message;
    var showPairView = function bt_showPairView() {
      console.log('--> onRequestPairing(): evt.address = ' + evt.address);
      var device = {
        address: evt.address,
        name: evt.name || _('unnamed-device'),
        icon: evt.icon || 'bluetooth-default'
      };

      // if (device.address !== pairingAddress) {
      //   pairingAddress = device.address;
      //   pairingMode = 'passive';
      // }
      var pairingMode = 'passive';

      var passkey = evt.passkey || null;
      var method = evt.method;
      var protocol = window.location.protocol;
      var host = window.location.host;
      var childWindow = window.open(protocol + '//' + host + '/onpair.html',
                  'pair_screen', 'attention');
      childWindow.onload = function childWindowLoaded() {
        childWindow.PairView.init(pairingMode, method, device, passkey);
      };
    };

    var req = navigator.mozSettings.createLock().get('lockscreen.locked');
    req.onsuccess = function bt_onGetLocksuccess() {
      if (!req.result['lockscreen.locked']) {
        showPairView();
      }
    };
    req.onerror = function bt_onGetLockError() {
      // fallback to default value 'unlocked'
      showPairView();
    };
  }

  navigator.mozSetMessageHandler('bluetooth-pairing-request',
    function bt_gotPairingRequest(message) {
      console.log('--> receive bluetooth-pairing-request event message = ' + message);
      initialDefaultAdapter(onRequestPairing(message));
      // onRequestPairing(message);
  });

  navigator.mozSetMessageHandler('bluetooth-cancel',
    function bt_gotCancelMessage(message) {
      // showDevicePaired(false, null);
      // TODO: cancel pairing dialog..
    }
  );
});
