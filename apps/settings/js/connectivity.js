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
  var DATA_TYPE_MAPPING = {
    'lte' : '4G LTE',
    'ehrpd': '4G CDMA',
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

  var _initialized = false;
  var _macAddress = '';
  var _ = navigator.mozL10n.get;
  var _airplaneMode = false;

  // in desktop helper we fake these device interfaces if they don't exist.
  var wifiManager = WifiHelper.getWifiManager();
  var bluetooth = getBluetooth();
  var mobileConnection = getMobileConnection();

  if (IccHelper) {
    IccHelper.addEventListener('cardstatechange', updateMessagingSettings);
  }

  // XXX if wifiManager implements addEventListener function
  // we can remove these listener lists.
  var wifiEnabledListeners = [updateWifi];
  var wifiDisabledListeners = [updateWifi];
  var wifiStatusChangeListeners = [updateWifi];
  var settings = Settings.mozSettings;

  var kCardStateL10nId; // see init()

  // Set wifi.enabled so that it mirrors the state of the hardware.
  // wifi.enabled is not an ordinary user setting because the system
  // turns it on and off when wifi goes up and down.
  //
  settings.createLock().set({'wifi.enabled': wifiManager.enabled});

  SettingsListener.observe('ril.radio.disabled', false, function(value) {
    _airplaneMode = value;
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

    updateCallDescription();
    updateCellAndDataDescription();
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
   * Call Settings
   */

  function updateCallDescription() {
    var iccId;

    var mobileConnections = window.navigator.mozMobileConnections;
    var iccManager = window.navigator.mozIccManager;
    if (!mobileConnections || !iccManager) {
      return;
    }

    // Only show the description for single ICC card devices. In case of multi
    // ICC card device the description to show for the ICC cards will be handled
    // in the call_iccs.js file.
    if (mobileConnections.length > 1) {
      return;
    }

    function showCallDescription() {
      var callDesc = document.getElementById('call-desc');
      callDesc.style.fontStyle = 'italic';

      if (!mobileConnections[0].iccId) {
        // TODO: this could mean there is no ICC card or the ICC card is
        // locked. If locked we would need to figure out how to check the
        // current card state. We show 'SIM card not ready'.
        localize(callDesc, kCardStateL10nId['null']);
        return;
      }

      if (mobileConnections[0].radioState !== 'enabled') {
        // Airplane is enabled. Well, radioState property could be changing but
        // let's show 'SIM card not ready' during the transitions also.
        localize(callDesc, kCardStateL10nId['null']);
        return;
      }

      var iccCard = iccManager.getIccById(mobileConnections[0].iccId);
      if (!iccCard) {
        localize(callDesc, '');
        return;
      }
      var cardState = iccCard.cardState;
      localize(callDesc, kCardStateL10nId[cardState || 'null']);
    }

    function addListeners() {
      iccId = mobileConnections[0].iccId;
      var iccCard = iccManager.getIccById(iccId);
      if (!iccCard) {
        return;
      }
      iccCard.addEventListener('cardstatechange',
                               showCallDescription);
      mobileConnections[0].addEventListener('radiostatechange',
                                            showCallDescription);
    }

    showCallDescription();
    addListeners();

    iccManager.addEventListener('iccdetected',
      function iccDetectedHandler(evt) {
        if (mobileConnections[0].iccId &&
           (mobileConnections[0].iccId === evt.iccId)) {
          showCallDescription();
          addListeners();
        }
    });

    iccManager.addEventListener('iccundetected',
      function iccUndetectedHandler(evt) {
        if (iccId === evt.iccId) {
          mobileConnections[0].removeEventListener('radiostatechange',
            showCallDescription());
        }
    });

  }

  /**
   * Cell & Data Settings
   */

  function updateCellAndDataDescription() {
    var iccId;

    var mobileConnections = window.navigator.mozMobileConnections;
    var iccManager = window.navigator.mozIccManager;
    if (!mobileConnections || !iccManager) {
      return;
    }

    // Only show the description for single ICC card devices. In case of multi
    // ICC card device the description to show for the ICC cards will be handled
    // in the carrier_iccs.js file.
    if (mobileConnections.length > 1) {
      return;
    }

    function showCellAndDataDescription() {
      var dataDesc = document.getElementById('data-desc');
      dataDesc.style.fontStyle = 'italic';

      if (!mobileConnections[0].iccId) {
        // TODO: this could mean there is no ICC card or the ICC card is
        // locked. If locked we would need to figure out how to check the
        // current card state. We show 'SIM card not ready'.
        localize(dataDesc, kCardStateL10nId['null']);
        return;
      }

      if (mobileConnections[0].radioState !== 'enabled') {
        // Airplane is enabled. Well, radioState property could be changing but
        // let's show 'SIM card not ready' during the transitions also.
        localize(dataDesc, kCardStateL10nId['null']);
        return;
      }

      var iccCard = iccManager.getIccById(mobileConnections[0].iccId);
      if (!iccCard) {
        localize(dataDesc, '');
        return;
      }

      var cardState = iccCard.cardState;
      if (cardState !== 'ready') {
        localize(dataDesc, kCardStateL10nId[cardState || 'null']);
        return;
      }

      dataDesc.style.fontStyle = 'normal';

      var network = mobileConnections[0].voice.network;
      var iccInfo = iccCard.iccInfo;
      var carrier = network ? (network.shortName || network.longName) : null;

      if (carrier && iccInfo && iccInfo.isDisplaySpnRequired && iccInfo.spn) {
        if (iccInfo.isDisplayNetworkNameRequired && carrier !== iccInfo.spn) {
          carrier = carrier + ' ' + iccInfo.spn;
        } else {
          carrier = iccInfo.spn;
        }
      }
      dataDesc.textContent = carrier;
      var dataType = (mobileConnections[0].data.connected &&
                      mobileConnections[0].data.type) ?
                      DATA_TYPE_MAPPING[mobileConnections[0].data.type] :
                      '';
      if (dataType) {
        dataDesc.textContent += ' - ' + dataType;
      }
    }

    function addListeners() {
      iccId = mobileConnections[0].iccId;
      var iccCard = iccManager.getIccById(iccId);
      if (!iccCard) {
        return;
      }
      iccCard.addEventListener('cardstatechange',
                               showCellAndDataDescription);
      mobileConnections[0].addEventListener('radiostatechange',
                                            showCellAndDataDescription);
      mobileConnections[0].addEventListener('datachange',
                                            showCellAndDataDescription);
    }

    showCellAndDataDescription();
    addListeners();

    iccManager.addEventListener('iccdetected',
      function iccDetectedHandler(evt) {
        if (mobileConnections[0].iccId &&
           (mobileConnections[0].iccId === evt.iccId)) {
          showCellAndDataDescription();
          addListeners();
        }
    });

    iccManager.addEventListener('iccundetected',
      function iccUndetectedHandler(evt) {
        if (iccId === evt.iccId) {
          mobileConnections[0].removeEventListener('radiostatechange',
            showCellAndDataDescription);
          mobileConnections[0].removeEventListener('datachange',
            showCellAndDataDescription);
        }
    });
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
