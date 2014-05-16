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
  var _bluetooth_address = '';
  var _initialized = false;
  var _macAddress = '';
  var _ = navigator.mozL10n.get;
  var SettingsCache = require('modules/settings_cache');

  // in desktop helper we fake these device interfaces if they don't exist.
  var wifiManager = WifiHelper.getWifiManager();
  var bluetooth = getBluetooth();
  var mobileConnection = getMobileConnection();

  var initOrder = [
    updateWifi,
    updateBluetooth
  ];

  // XXX if wifiManager implements addEventListener function
  // we can remove these listener lists.
  var wifiEnabledListeners = [updateWifi];
  var wifiDisabledListeners = [updateWifi];
  var wifiStatusChangeListeners = [updateWifi];
  var settings = Settings.mozSettings;

  //
  // Now register callbacks to track the state of the wifi hardware
  //
  if (wifiManager) {
    // Set wifi.enabled so that it mirrors the state of the hardware.
    // wifi.enabled is not an ordinary user setting because the system
    // turns it on and off when wifi goes up and down.
    //
    settings.createLock().set({'wifi.enabled': wifiManager.enabled});

    wifiManager.onenabled = function() {
      dispatchEvent(new CustomEvent('wifi-enabled'));
      wifiEnabled();
    };
    wifiManager.ondisabled = function() {
      dispatchEvent(new CustomEvent('wifi-disabled'));
      wifiDisabled();
    };
    wifiManager.onstatuschange = wifiStatusChange;
  }

  // Register callbacks to track the state of the bluetooth hardware
  if (bluetooth) {
    bluetooth.addEventListener('adapteradded', function() {
      dispatchEvent(new CustomEvent('bluetooth-adapter-added'));
      updateBluetooth();
    });
    bluetooth.addEventListener('disabled', function() {
      dispatchEvent(new CustomEvent('bluetooth-disabled'));
      updateBluetooth();
    });
  }

  window.addEventListener('bluetooth-pairedstatuschanged', updateBluetooth);

  function lazyInit(index) {
    if (index >= initOrder.length) {
      return;
    }

    initOrder[index]();
    setTimeout(lazyInit.bind(this, index + 1));
  }

  // called when localization is done
  function init() {
    if (_initialized) {
      return;
    }
    _initialized = true;

    lazyInit(0);
  }

  /**
   * Wifi Manager
   */

  var wifiDesc = document.getElementById('wifi-desc');

  function updateWifi() {
    if (!wifiManager) {
      return;
    }
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
      var networkProp = wifiManager.connection.network ?
          {ssid: wifiManager.connection.network.ssid} : null;
      localize(wifiDesc, 'fullStatus-' + wifiManager.connection.status,
               networkProp);
    } else {
      localize(wifiDesc, 'disabled');
    }
  }

  function storeMacAddress() {
    if (!wifiManager) {
      return;
    }
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

  // Keep the setting in sync with the hardware state.  We need to do this
  // because b2g/dom/wifi/WifiWorker.js can turn the hardware on and off.
  function syncWifiEnabled(enabled, callback) {
    SettingsCache.getSettings(function(results) {
      var wifiEnabled = results['wifi.enabled'];
      if (wifiEnabled !== enabled) {
        settings.createLock().set({'wifi.enabled': enabled});
      }
      callback();
    });
  }

  function wifiEnabled() {
    syncWifiEnabled(true, function() {
      wifiEnabledListeners.forEach(function(listener) { listener(); });
      storeMacAddress();
    });
  }

  function wifiDisabled() {
    syncWifiEnabled(false, function() {
      wifiDisabledListeners.forEach(function(listener) { listener(); });
    });
  }

  function wifiStatusChange(event) {
    wifiStatusChangeListeners.forEach(function(listener) { listener(event); });
  }

  /**
   * Bluetooth Manager
   */

  function updateBluetooth() {
    if (!bluetooth) {
      return;
    }
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

    // If the BT address is in the Settings database, it's already displayed in
    // all `Bluetooth address' fields; if not, it will be set as soon as BT is
    // enabled.
    if (!_bluetooth_address && settings) {
      var req = settings.createLock().get('deviceinfo.bt_address');
      req.onsuccess = function btAddr_onsuccess() {
        _bluetooth_address = req.result['deviceinfo.bt_address'];
      };
    }

    var req = bluetooth.getDefaultAdapter();
    req.onsuccess = function bt_getAdapterSuccess() {
      var defaultAdapter = req.result;

      // Set Bluetooth address after getting the adapter if it wasn't already
      // done so earlier.
      if (!_bluetooth_address && defaultAdapter.address) {
        _bluetooth_address = defaultAdapter.address;

        settings.createLock().set({ 'deviceinfo.bt_address':
                                   _bluetooth_address });
        // update UI fields
        var fields =
          document.querySelectorAll('[data-name="deviceinfo.bt_address"]');
        for (var i = 0, l = fields.length; i < l; i++) {
          fields[i].textContent = _bluetooth_address;
        }
      }

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
navigator.mozL10n.once(function loadWhenIdle() {
  var idleObserver = {
    time: 3,
    onidle: function() {
      Connectivity.init();
      navigator.removeIdleObserver(idleObserver);
    }
  };
  navigator.addIdleObserver(idleObserver);
});
