/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

// handle BlueTooth settings
window.addEventListener('localized', function bluetoothSettings(evt) {
  var _ = navigator.mozL10n.get;
  var settings = window.navigator.mozSettings;
  var bluetooth = window.navigator.mozBluetooth;
  var defaultAdapter = null;

  if (!settings || !bluetooth)
    return;

  var gBluetoothInfoBlock = document.querySelector('#bluetooth-desc');
  var gBluetoothCheckBox = document.querySelector('#bluetooth-status input');

  // display Bluetooth power state
  function updateBluetoothState(value) {
    gBluetoothInfoBlock.textContent = value ? _('enabled') : _('disabled');
    gBluetoothCheckBox.checked = value;
  }

  // activate main button
  gBluetoothCheckBox.onchange = function changeBluetooth() {
    settings.getLock().set({'bluetooth.enabled': this.checked});
  };

  function initailDefaultAdapter() {
    if (!bluetooth.enabled)
      return;
    var req = bluetooth.getDefaultAdapter();
    req.onsuccess = function bt_getAdapterSuccess() {
      defaultAdapter = req.result;
      if (defaultAdapter == null) {
        // we can do nothing without DefaultAdapter, so set bluetooth disabled
        settings.getLock().set({'bluetooth.enabled': false});
        return;
      }
      defaultAdapter.ondevicefound = gDeviceList.onDeviceFound;

      // initial related components that need defaultAdapter.
      gMyDeviceInfo.initWithAdapter();
      gDeviceList.initWithAdapter();
    };
    req.onerror = function bt_getAdapterFailed() {
      // we can do nothing without DefaultAdapter, so set bluetooth disabled
      settings.getLock().set({'bluetooth.enabled': false});
    }
  }

  // device information
  var gMyDeviceInfo = (function deviceInfo() {
    var visibleItem = document.querySelector('#bluetooth-visible-device');
    var visibleName = document.querySelector('#bluetooth-device-name');
    var visibleCheckBox =
      document.querySelector('#bluetooth-visible-device input');
    var renameItem = document.querySelector('#bluetooth-advanced');
    var renameButton = document.querySelector('#bluetooth-advanced button');
    var myName = '';

    visibleCheckBox.onchange = function changeDiscoverable() {
      setDiscoverable(this.checked);
    };

    renameButton.onclick = function renameClicked() {
      renameDialog.show();
    };

    // Wrapper rename dialog to be interactive.
    var renameDialog = (function wrapperDialog() {
      var dialog = document.querySelector('#bluetooth-rename');
      var inputField = document.querySelector('#bluetooth-rename input');
      if (!dialog)
        return null;

      // OK|Cancel buttons
      dialog.onreset = close;
      dialog.onsubmit = function() {
        var nameEntered = inputField.value;
        if (nameEntered === '')
          return;

        if (nameEntered === myName)
          return close();

        var req = defaultAdapter.setName(nameEntered);
        req.onsuccess = function bt_renameSuccess() {
          myName = visibleName.textContent = defaultAdapter.name;
          return close();
        }
      };

      function close() {
        dialog.removeAttribute('class');
        return false; // ignore <form> action
      }

      // The only exposed method.
      function show() {
        inputField.value = myName;
        dialog.className = 'active';
      }

      return {
        show: show
      };
    })();

    // immediatly UI update, DOM element manipulation.
    function updateDeviceInfo(show) {
      if (show) {
        renameItem.hidden = false;
        visibleItem.hidden = false;
      } else {
        renameItem.hidden = true;
        visibleItem.hidden = true;
      }
    }

    // initial this device information and do default actions
    // when DefaultAdapter is ready.
    function initial() {
      setDiscoverable(visibleCheckBox.checked);
    }

    function setDiscoverable(visible) {
      if (!defaultAdapter) {
        return;
      }
      defaultAdapter.setDiscoverable(visible);
      myName = visibleName.textContent = defaultAdapter.name;
    }

    // API
    return {
      update: updateDeviceInfo,
      initWithAdapter: initial,
      setDiscoverable: setDiscoverable
    };
  })();

  // device list
  var gDeviceList = (function deviceList() {
    var list = document.querySelector('#bluetooth-devices');
    var searchingItem = document.querySelector('#bluetooth-searching');
    var enableMsg = document.querySelector('#bluetooth-enable-msg');
    var index = [];

    // private DOM helper: create a device list item
    function newListItem(device) {
      var deviceName = document.createElement('a');
      deviceName.textContent = device.name;

      var deviceAddress = document.createElement('small');
      deviceAddress.textContent = device.address;

      var li = document.createElement('li');
      li.appendChild(deviceAddress);
      li.appendChild(deviceName);

      // bind paired callback
      li.onclick = function() {
        //XXX should call pair() here
        //but hasn't been implemented in the backend.
      };
      return li;
    }

    // private helper: clear the device list
    function clear() {
      while (list.hasChildNodes()) {
        list.removeChild(list.lastChild);
      }
      index = [];
    }


    // immediatly UI update, DOM element manipulation.
    function updateDeviceList(show) {
      if (show) {
        clear();
        enableMsg.hidden = true;
        searchingItem.hidden = false;

      } else {
        clear();
        enableMsg.hidden = false;
        searchingItem.hidden = true;
      }
    }

    // do default actions (start discover avaliable devices)
    // when DefaultAdapter is ready.
    function initial() {
      startDiscovery();
    }

    // callback function when an avaliable device found
    function onDeviceFound(evt) {
      // check duplicate
      var i = length = index.length;
      while (i >= 0) {
        if (index[i] === evt.device.address) {
          return;
        }
        i -= 1;
      }
      list.appendChild(newListItem(evt.device));
      index.push(evt.device.address);
    }

    function startDiscovery() {
      if (!defaultAdapter)
        return;

      var req = defaultAdapter.startDiscovery();
      req.onerror = function bt_discoveryFailed() {
        searchingItem.hidden = true;
      };
    }

    // API
    return {
      update: updateDeviceList,
      initWithAdapter: initial,
      startDiscovery: startDiscovery,
      onDeviceFound: onDeviceFound
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

    //XXX should be removed
    hackForTest(enabled);

    gDeviceList.update(enabled);
    gMyDeviceInfo.update(enabled);
  });

  // startup, update status
  var req = settings.getLock().get('bluetooth.enabled');

  req.onsuccess = function bt_EnabledSuccess() {
    lastMozSettingValue = req.result['bluetooth.enabled'];
    updateBluetoothState(lastMozSettingValue);

    //XXX should be removed
    hackForTest(lastMozSettingValue);

    gDeviceList.update(lastMozSettingValue);
    gMyDeviceInfo.update(lastMozSettingValue);
  };

  //XXX hack due to the following bugs.
  function hackForTest(enabled) {
    //XXX mozBluetooth is not a singleton
    //so the setting in System app won't take effect here
    //https://bugzilla.mozilla.org/show_bug.cgi?id=782588
    bluetooth.setEnabled(enabled);
    if (enabled) {
      //XXX there is no "bluetooth.onenabled" callback can be hooked.
      //https://bugzilla.mozilla.org/show_bug.cgi?id=782586
      if (!bluetooth.enabled) {
        setTimeout(initailDefaultAdapter, 5000);
      } else {
        initailDefaultAdapter();
      }
    }
  }

});

