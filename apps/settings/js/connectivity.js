/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * This library displays the connectivity status in the main panel without
 * requiring the full `wifi.js' + `carrier.js' + `bluetooth.js' libraries.
 */

var gBluetooth = (function(window) {
  var navigator = window.navigator;
  if ('mozBluetooth' in navigator)
    return navigator.mozBluetooth;
  return null;
})(this);


// TODO: handle hotspot status

// display connectivity status on the main panel
var Connectivity = (function(window, document, undefined) {
  var _initialized = false;
  var _ = navigator.mozL10n.get;
  var wifiManager = getWifiManager();
  var wifiEnabledListeners = [updateWifi];
  var wifiDisabledListeners = [updateWifi];
  var wifiStatusChangeListeners = [updateWifi];
  var settings = Settings.mozSettings;

  //
  // Set wifi.enabled so that it mirrors the state of the hardware.
  // wifi.enabled is not an ordinary user setting because the system
  // turns it on and off when wifi goes up and down.
  //
  settings.createLock().set({'wifi.enabled': wifiManager.enabled});

  //
  // Now register callbacks to track the state of the wifi hardware
  //
  wifiManager.onenabled = function() {
    dispatchEvent(new CustomEvent('wifi-enabled'));
    wifiEnabled();
  };
  wifiManager.ondisabled = function() {
    dispatchEvent(new CustomEvent('wifi-disabled'));
    wifiDisabled();
  };
  wifiManager.onstatuschange = wifiStatusChange;

  function init() {
    if (_initialized) {
      return;
    }
    _initialized = true;

    var mobileConnection = getMobileConnection();
    updateWifi();

    // this event listener is not cleared by carrier.js
    kCardState = {
      'pinRequired' : _('simCardLockedMsg'),
      'pukRequired' : _('simCardLockedMsg'),
      'networkLocked' : _('simLockedPhone'),
      'unknown' : _('unknownSimCardState'),
      'absent' : _('noSimCard'),
      'null' : _('simCardNotReady')
    };
    mobileConnection.addEventListener('datachange', updateCarrier);
    updateCarrier();
    mobileConnection.addEventListener('cardstatechange', updateCallSettings);
    updateCallSettings();

    // these listeners are replaced when bluetooth.js is loaded
    gBluetooth.onadapteradded = function() {
      dispatchEvent(new CustomEvent('bluetooth-adapter-added'));
      updateBluetooth();
    };
    gBluetooth.ondisabled = function() {
      dispatchEvent(new CustomEvent('bluetooth-disabled'));
      updateBluetooth();
    };
    updateBluetooth();
    initSystemMessageHandler();
  }

  /**
   * Wifi Manager
   */

  var wifiDesc = document.getElementById('wifi-desc');

  function updateWifi() {
    if (!_initialized) {
      init();
      return; // init will call updateWifi()
    }

    // network.connection.status has one of the following values:
    // connecting, associated, connected, connectingfailed, disconnected.
    wifiDesc.textContent = _('fullStatus-' +
        wifiManager.connection.status,
        wifiManager.connection.network);

    // record the MAC address here because the "Device Information" panel
    // has to display it as well
    if (settings) {
      settings.createLock().set({ 'deviceinfo.mac': wifiManager.macAddress });
    }
  }

  function wifiEnabled() {
    // Keep the setting in sync with the hardware state.
    // We need to do this because b2g/dom/wifi/WifiWorker.js can turn
    // the hardware on and off
    settings.createLock().set({'wifi.enabled': true});
    wifiEnabledListeners.forEach(function(listener) { listener(); });
  }

  function wifiDisabled() {
    // Keep the setting in sync with the hardware state.
    settings.createLock().set({'wifi.enabled': false});
    wifiDisabledListeners.forEach(function(listener) { listener(); });
  }

  function wifiStatusChange(event) {
    wifiStatusChangeListeners.forEach(function(listener) { listener(event); });
  }

  /**
   * Mobile Connection Manager
   */

  var kCardState; // see init()
  var kDataType = {
    'lte' : '4G LTE',
    'ehrpd': 'CDMA',
    'hspa+': '3.5G HSPA+',
    'hsdpa': '3.5G HSDPA',
    'hsupa': '3.5G HSDPA',
    'hspa' : '3.5G HSDPA',
    'evdo0': '3G CDMA',
    'evdoa': '3G CDMA',
    'evdob': '3G CDMA',
    '1xrtt': '3G CDMA',
    'umts' : '3G UMTS',
    'edge' : '2G EDGE',
    'is95a': '2G CDMA',
    'is95b': '2G CDMA',
    'gprs' : '2G GPRS'
  };

  var dataDesc = document.getElementById('data-desc');

  function updateCarrier() {
    if (!_initialized) {
      init();
      return; // init will call updateCarrier()
    }

    var mobileConnection = getMobileConnection();

    var setCarrierStatus = function(msg) {
      var operator = msg.operator || '';
      var data = msg.data || '';
      var text = msg.error ||
        ((data && operator) ? (operator + ' - ' + data) : operator);
      dataDesc.textContent = text;

      /**
       * XXX italic style for specifying state change is not a ideal solution
       * for non-Latin alphabet scripts in terms of typography, e.g. Chinese,
       * Japanese, etc.
       * We might have to switch to labels with parenthesis for these languages.
       */
      dataDesc.style.fontStyle = msg.error ? 'italic' : 'normal';

      // in case the "Carrier & Data" panel is displayed...
      var dataNetwork = document.getElementById('dataNetwork-desc');
      var dataConnection = document.getElementById('dataConnection-desc');
      if (dataNetwork && dataConnection) {
        dataNetwork.textContent = operator;
        dataConnection.textContent = data;
      }
    };

    if (!mobileConnection)
      return setCarrierStatus({});

    // ensure the SIM card is present and unlocked
    var cardState = kCardState[mobileConnection.cardState ?
                               mobileConnection.cardState :
                               'null'];
    if (cardState)
      return setCarrierStatus({ error: cardState });

    // operator name & data connection type
    if (!mobileConnection.data || !mobileConnection.data.network)
      return setCarrierStatus({ error: '???'}); // XXX should never happen
    var operatorInfos = MobileOperator.userFacingInfo(mobileConnection);
    var operator = operatorInfos.operator;
    if (operatorInfos.region) {
      operator += ' ' + operatorInfos.region;
    }
    var data = mobileConnection.data;
    var dataType = (data.connected && data.type) ? kDataType[data.type] : '';
    setCarrierStatus({
      operator: operator,
      data: dataType
    });
  }

  /**
   * Call Settings
   */

  var callDesc = document.getElementById('call-desc');
  callDesc.style.fontStyle = 'italic';

  function updateCallSettings() {
    if (!_initialized) {
      init();
      return; // init will call updateCallSettings()
    }

    var mobileConnection = getMobileConnection();

    if (!mobileConnection)
      return;

    // update the current SIM card state
    var cardState = mobileConnection.cardState;
    callDesc.textContent = kCardState[cardState] || '';
  }

  /**
   * Bluetooth Manager
   */

  var bluetoothDesc = document.getElementById('bluetooth-desc');

  function updateBluetooth() {
    bluetoothDesc.textContent = gBluetooth.enabled ?
      _('bt-status-nopaired') : _('bt-status-turnoff');
    if (!gBluetooth.enabled) {
      return;
    }
    var req = gBluetooth.getDefaultAdapter();
    req.onsuccess = function bt_getAdapterSuccess() {
      var defaultAdapter = req.result;
      var reqPaired = defaultAdapter.getPairedDevices();
      reqPaired.onsuccess = function bt_getPairedSuccess() {
        // copy for sorting
        var paired = reqPaired.result.slice();
        var length = paired.length;
        if (length == 0) {
          return;
        }
        paired.sort(function(a, b) {
          return a.name > b.name;
        });
        var text = _('bt-status-paired', {
          name: paired[0].name,
          n: length - 1
        });
        bluetoothDesc.textContent = text;
      };
    };
  }

  function initSystemMessageHandler() {
    var handlePairingRequest = function(message, method) {
      window.location.hash = '#bluetooth';
      setTimeout(function() {
        gDeviceList.onRequestPairing(message, method);
      }, 1500);
    };

    // Bind message handler for incoming pairing requests
    navigator.mozSetMessageHandler('bluetooth-requestconfirmation',
      function bt_gotConfirmationMessage(message) {
        handlePairingRequest(message, 'confirmation');
      }
    );

    navigator.mozSetMessageHandler('bluetooth-requestpincode',
      function bt_gotPincodeMessage(message) {
        handlePairingRequest(message, 'pincode');
      }
    );

    navigator.mozSetMessageHandler('bluetooth-requestpasskey',
      function bt_gotPasskeyMessage(message) {
        handlePairingRequest(message, 'passkey');
      }
    );
  }

  /**
   * Public API, in case a "Connectivity" sub-panel needs it
   */

  return {
    init: init,
    updateWifi: updateWifi,
    updateCarrier: updateCarrier,
    updateBluetooth: updateBluetooth,
    get statusText() {
      return {
        wifi: document.getElementById('wifi-desc').textContent,
        carrier: document.getElementById('data-desc').textContent,
        hotspot: document.getElementById('hotspot-desc').textContent,
        bluetooth: document.getElementById('bluetooth-desc').textContent
      };
    },
    set wifiEnabled(listener) { wifiEnabledListeners.push(listener) },
    set wifiDisabled(listener) { wifiDisabledListeners.push(listener); },
    set wifiStatusChange(listener) { wifiStatusChangeListeners.push(listener); }
  };
})(this, document);


// starting when we get a chance
navigator.mozL10n.ready(function loadWhenIdle() {
  var idleObserver = {
    time: 3,
    onidle: function() {
      Connectivity.init();
      navigator.removeIdleObserver(idleObserver);
    }
  };
  navigator.addIdleObserver(idleObserver);
});
