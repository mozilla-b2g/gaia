/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// handle BlueTooth settings
window.addEventListener('localized', function bluetoothSettings(evt) {
  var _ = navigator.mozL10n.get;
  var settings = window.navigator.mozSettings;
  var bluetooth = window.navigator.mozBluetooth;
  var defaultAdapter = null;

  if (!settings)
    return;

  if (!bluetooth) {
    dump("===== bluetooth not found!");
    return;
  }

  var gBluetoothInfoBlock = document.querySelector('#bluetooth-desc');
  var gBluetoothCheckBox = document.querySelector('#bluetooth-status input');
  var gVisibleCheckBox = document.querySelector('#bluetooth-visible-device input');

  // display Bluetooth power state
  function updateBluetoothState(value) {
    gBluetoothInfoBlock.textContent = value ? _('enabled') : _('disabled');
    gBluetoothCheckBox.checked = value;
  }

  // activate main button
  gBluetoothCheckBox.onchange = function changeBluetooth() {
    settings.getLock().set({'bluetooth.enabled': this.checked});
  };

  gVisibleCheckBox.onchange = function changeVisible() {
    if (!defaultAdapter) {
      return;
    }
    defaultAdapter.setDiscoverable(this.checked);
  };

  // device list
  var gDeviceList = (function deviceList() {
    var list = document.querySelector('#bluetooth-devices');
    var searchingItem = document.querySelector('#bluetooth-searching');
    var index = [];

    function initailDefaultAdapter() {
      dump("===== [gDeviceList] bluetooth.enabled " + bluetooth.enabled);
      if (!bluetooth.enabled)
        return;
      var req = bluetooth.getDefaultAdapter();
      dump("===== [gDeviceList] req " + req);
      req.onsuccess = function bt_gotDefaultAdapter() {
        dump("===== [gDeviceList] get default adapter: "+ req.result);
        defaultAdapter = req.result;
        if(defaultAdapter == null) {
          dump("===== [gDeviceList] No Adapter Available");
          return;
        }
        defaultAdapter.ondevicefound = function bt_onDeviceFound(evt) {
          // check duplicate device  
          var i = length = index.length;
          while(i >= 0) {
            if (index[i] === evt.device.address) {
              return;
            }
            i -= 1;
          }
          list.appendChild(newListItem(evt.device));
          index.push(evt.device.address);
        };
        defaultAdapter.setDiscoverable(gVisibleCheckBox.checked);

        //TODO should be a callback
        startDiscovery();
      };
      req.onerror = function bt_getDefaultAdapterFailed() {
        dump("===== Error: get default adapter - " + req.error.name);
      };
    }

    // private DOM helper: create a network list item
    function newListItem(device) {
      // ssid
      var deviceName = document.createElement('a');
      deviceName.textContent = device.name;

      // supported authentication methods
      var deviceAddress = document.createElement('small');
      deviceAddress.textContent = device.address;

      // create list item
      var li = document.createElement('li');
      li.appendChild(deviceAddress);
      li.appendChild(deviceName);

      // bind connection callback
      li.onclick = function() {
        //XXX toggleDevice(device);
      };
      return li;
    }

    function updateDeviceList(show) {
      if (show) {
        clear(true);
        searchingItem.hidden = false;
        gVisibleCheckBox.hidden = false;
        //XXX: hack because there is no "bluetooth.onEnabled" callback hook.
        if (!bluetooth.enabled) {
          dump("==== [Observer] bluetooth not enabled, setTimeout");
          setTimeout(initailDefaultAdapter, 5000);
        } else {
          initailDefaultAdapter();
        }

      } else {
        clear(false);
        searchingItem.hidden = true;
        gVisibleCheckBox.hidden = true;
      }
    }

    function startDiscovery() {
      if (!defaultAdapter) {
        dump("==== [startDiscovery] defaultAdapter is not ready")
        return;
      }
      var req = defaultAdapter.startDiscovery(); 
      req.onsuccess = function bt_discoverySuccess() {
        dump("===== Start Discovery Success");
      };
      req.onerror = function bt_discoveryFailed() {
        dump("===== Start Discovery Failed");
      };
    }

    // clear the network list
    function clear(showSearchingItem) {
      while (list.hasChildNodes()) {
        list.removeChild(list.lastChild);
      }
      index = [];
    }

    // API
    return {
      init: initailDefaultAdapter,
      update: updateDeviceList
    };

  })();


  var lastMozSettingValue = false;

  // enable Bluetooth if the related settings says so
  // register an observer to monitor bluetooth.enabled changes
  settings.addObserver('bluetooth.enabled', function(event) {
    var enabled = event.settingValue;
    if (lastMozSettingValue == enabled)
      return;

    lastMozSettingValue = enabled;
    updateBluetoothState(enabled);
    //XXX hack for test
    bluetooth.setEnabled(enabled);
    gDeviceList.update(enabled);
  });

  // startup, update status
  var req = settings.getLock().get('bluetooth.enabled');

  req.onsuccess = function bt_EnabledSuccess() {
    lastMozSettingValue = req.result['bluetooth.enabled'];
    updateBluetoothState(lastMozSettingValue);
    //XXX hack for test
    bluetooth.setEnabled(lastMozSettingValue);
    gDeviceList.update(lastMozSettingValue);
  };

});

