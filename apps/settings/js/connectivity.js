/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * This library displays the connectivity status in the main panel without
 * requiring the full `wifi.js' + `carrier.js' + `bluetooth.js' libraries.
 */

// TODO: handle hotspot status

// display connectivity status on the main panel
var Connectivity = (function(window, document, undefined) {
  var _initialized = false;
  var _macAddress = '';
  var _ = navigator.mozL10n.get;
  var _airplaneMode = false;

  // in desktop helper we fake these device interfaces if they don't exist.
  var wifiManager = WifiHelper.getWifiManager();
  var bluetooth = getBluetooth();
  var mobileConnection = getMobileConnection();

  if (mobileConnection) {
    mobileConnection.addEventListener('datachange', updateCarrier);
  }
  if (IccHelper) {
    IccHelper.addEventListener('cardstatechange', updateCallSettings);
    IccHelper.addEventListener('cardstatechange', updateMessagingSettings);
  }

  // XXX if wifiManager implements addEventListener function
  // we can remove these listener lists.
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

  SettingsListener.observe('ril.radio.disabled', false, function(value) {
    _airplaneMode = value;
    updateCarrier();
    updateCallSettings();
    updateMessagingSettings();
  });

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

  // Register callbacks to track the state of the bluetooth hardware
  bluetooth.addEventListener('adapteradded', function() {
    dispatchEvent(new CustomEvent('bluetooth-adapter-added'));
    updateBluetooth();
  });
  bluetooth.addEventListener('disabled', function() {
    dispatchEvent(new CustomEvent('bluetooth-disabled'));
    updateBluetooth();
  });

  window.addEventListener('bluetooth-pairedstatuschanged', updateBluetooth);

  // called when localization is done
  function init() {
    if (_initialized) {
      return;
    }
    _initialized = true;

    kCardStateL10nId = {
      'pinRequired' : 'simCardLockedMsg',
      'pukRequired' : 'simCardLockedMsg',
      'networkLocked' : 'simLockedPhone',
      'serviceProviderLocked' : 'simLockedPhone',
      'corporateLocked' : 'simLockedPhone',
      'unknown' : 'unknownSimCardState',
      'illegal' : 'simCardIllegal',
      'absent' : 'noSimCard',
      'null' : 'simCardNotReady',
      'ready': ''
    };

    updateCarrier();
    updateCallSettings();
    updateMessagingSettings();
    updateWifi();
    updateBluetooth();
    // register blutooth system message handler
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

    // If the MAC address is in the Settings database, it's already displayed in
    // all `MAC address' fields; if not, it will be set as soon as the Wi-Fi is
    // enabled (see `storeMacAddress').
    if (!_macAddress && settings) {
      var req = settings.createLock().get('deviceinfo.mac');
      req.onsuccess = function macAddr_onsuccess() {
        _macAddress = req.result['deviceinfo.mac'];
      };
    }

    if (wifiManager.enabled) {
      storeMacAddress();
      // network.connection.status has one of the following values:
      // connecting, associated, connected, connectingfailed, disconnected.
      localize(wifiDesc, 'fullStatus-' + wifiManager.connection.status,
               wifiManager.connection.network);
    } else {
      localize(wifiDesc, 'disabled');
    }
  }

  function storeMacAddress() {
    // Store the MAC address in the Settings database.  Note: the wifiManager
    // sets macAddress to the string `undefined' when it is not available.
    if (settings && wifiManager.macAddress &&
                    wifiManager.macAddress !== _macAddress &&
                    wifiManager.macAddress !== 'undefined') {
      _macAddress = wifiManager.macAddress;
      settings.createLock().set({ 'deviceinfo.mac': _macAddress });
      // update all related fields in the UI
      var fields = document.querySelectorAll('[data-name="deviceinfo.mac"]');
      for (var i = 0, l = fields.length; i < l; i++) {
        fields[i].textContent = _macAddress;
      }
    }
  }

  function wifiEnabled() {
    // Keep the setting in sync with the hardware state.  We need to do this
    // because b2g/dom/wifi/WifiWorker.js can turn the hardware on and off.
    settings.createLock().set({'wifi.enabled': true});
    wifiEnabledListeners.forEach(function(listener) { listener(); });
    storeMacAddress();
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

  var kCardStateL10nId; // see init()
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
    '1xrtt': '2G CDMA',
    'umts' : '3G UMTS',
    'edge' : '2G EDGE',
    'is95a': '2G CDMA',
    'is95b': '2G CDMA',
    'gprs' : '2G GPRS'
  };

  var dataDesc = document.getElementById('data-desc');

  function updateCarrier() {
    // if 'datachange' event happens before init
    if (!_initialized) {
      init();
      return; // init will call updateCarrier()
    }

    var setCarrierStatus = function(msg) {
      var operator = msg.operator || '';
      var data = msg.data || '';
      var text = msg.error ||
        ((data && operator) ? (operator + ' - ' + data) : operator);
      dataDesc.textContent = text;
      dataDesc.dataset.l10nId = msg.l10nId || '';

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

    if (!mobileConnection || !IccHelper)
      return setCarrierStatus({});

    // ensure the SIM card is present and unlocked
    var cardState = _airplaneMode ? 'null' : IccHelper.cardState || 'absent';
    var l10nId = kCardStateL10nId[cardState];
    if (l10nId) {
      return setCarrierStatus({ error: _(l10nId), l10nId: l10nId });
    }

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

    if (!IccHelper)
      return;

    // update the current SIM card state
    var cardState = _airplaneMode ? 'null' : IccHelper.cardState || 'absent';
    localize(callDesc, kCardStateL10nId[cardState]);
  }

  /**
   * Messaging Settings
   */

  var messagingDesc = document.getElementById('messaging-desc');
  messagingDesc.style.fontStyle = 'italic';

  function updateMessagingSettings() {
    if (!_initialized) {
      init();
      return; // init will call updateMessagingSettings()
    }

    if (!IccHelper)
      return;

    // update the current SIM card state
    var cardState = _airplaneMode ? 'null' : IccHelper.cardState || 'absent';
    localize(messagingDesc, kCardStateL10nId[cardState]);
  }

  /**
   * Bluetooth Manager
   */


  function updateBluetooth() {
    var bluetoothDesc = document.getElementById('bluetooth-desc');
    // if 'adapteradd' or 'disabled' event happens before init
    if (!_initialized) {
      init();
      return; // init will call updateBluetooth()
    }

    var l10nId = bluetooth.enabled ? 'bt-status-nopaired' : 'bt-status-turnoff';
    localize(bluetoothDesc, l10nId);

    if (!bluetooth.enabled) {
      return;
    }
    var req = bluetooth.getDefaultAdapter();
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

        localize(bluetoothDesc, 'bt-status-paired',
                 { name: paired[0].name, n: length - 1 });
      };
    };
  }

  function initSystemMessageHandler() {
    // XXX this is not a good way to interact with bluetooth.js
    var handlePairingRequest = function(message) {
      Settings.currentPanel = '#bluetooth';
      setTimeout(function() {
        dispatchEvent(new CustomEvent('bluetooth-pairing-request', {
          detail: message
        }));
      }, 1500);
    };

    // Bind message handler for incoming pairing requests
    navigator.mozSetMessageHandler('bluetooth-pairing-request',
      function bt_gotPairingRequestMessage(message) {
        handlePairingRequest(message);
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
