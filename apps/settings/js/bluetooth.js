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
    gBluetoothInfoBlock.textContent =
      value ? _('bt-status-nopaired') : _('bt-status-turnoff');
    gBluetoothCheckBox.checked = value;
  }

  // activate main button
  gBluetoothCheckBox.onchange = function changeBluetooth() {
    settings.getLock().set({'bluetooth.enabled': this.checked});
  };

  function initialDefaultAdapter() {
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
      defaultAdapter.onrequestconfirmation = gDeviceList.onRequestConfirmation;
      defaultAdapter.onrequestpincode = gDeviceList.onRequestConfirmation;
      defaultAdapter.onrequestpasskey = gDeviceList.onRequestConfirmation;

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
    var advancedItem = document.querySelector('#bluetooth-advanced');
    var advancedButton = document.querySelector('#bluetooth-advanced button');
    var renameButton = document.querySelector('#bluetooth-rename-btn button');
    var myName = '';

    visibleCheckBox.onchange = function changeDiscoverable() {
      settings.getLock().set({'bluetooth.visible': this.checked});
      setDiscoverable(this.checked);
    };

    advancedButton.onclick = function advancedMenuClicked() {
      window.location.hash = '#bluetooth-advanced-menu';
    };

    renameButton.onclick = function renameBtnClicked() {
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
        advancedItem.hidden = false;
        visibleItem.hidden = false;
        // get last user setting for device visible
        var req = settings.getLock().get('bluetooth.visible');
        req.onsuccess = function bt_getVisibleSuccess() {
          var visible = req.result['bluetooth.visible'];
          if (typeof visible === 'undefined') {
            visible = true;
          }
          visibleCheckBox.checked = visible;
        };
        req.onerror = function bt_getVisibleError() {
          visibleCheckBox.checked = true;
        };
      } else {
        advancedItem.hidden = true;
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
    var pairList = document.querySelector('#bluetooth-paired-devices');
    var openList = document.querySelector('#bluetooth-devices');
    var searchAgainBtn = document.querySelector('#bluetooth-search-again');
    var searchingItem = document.querySelector('#bluetooth-searching');
    var enableMsg = document.querySelector('#bluetooth-enable-msg');
    var openIndex = [];
    var pairIndex = [];

    searchAgainBtn.onclick = function searchAgainClicked() {
      updateDeviceList(true); // reset network list
      startDiscovery();
    };

    // private DOM helper: create a device list item
    function newListItem(device) {
      var deviceName = document.createElement('a');
      var aName = (device.name === '') ? _('unnamed') : device.name;
      deviceName.textContent = aName;

      var deviceAddress = document.createElement('small');
      deviceAddress.textContent = device.address;

      var li = document.createElement('li');
      li.appendChild(deviceAddress);
      li.appendChild(deviceName);

      // bind paired callback
      li.onclick = function() {
        dump("==== ask for pair: "+device.name+" "+device.address);
        defaultAdapter.pair(device);
      };
      return li;
    }

    // private helper: clear the device list
    function clear() {
      while (openList.hasChildNodes()) {
        openList.removeChild(openList.lastChild);
      }
      openIndex = [];
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
      getPairedDevice();
    }

    // callback function when an avaliable device found
    function onDeviceFound(evt) {
      // check duplicate
      var i = openIndex.length - 1;
      while (i >= 0) {
        if (openIndex[i].address === evt.device.address) {
          return;
        }
        i -= 1;
      }
      openList.appendChild(newListItem(evt.device));
      openIndex.push(evt.device);
    }

    function onRequestConfirmation(evt) {
      dump("=====request pair "+evt.address+"  "+evt.passkey);
      // prepare to pop out attention screen, ring the ringtone, vibrate
      var protocol = window.location.protocol;
      var host = window.location.host;
      window.open(protocol + '//' + host + '/onpair.html',
                  'pair_screen', 'attention');
    }

    function getPairedDevice() {
      var req = defaultAdapter.getPairedDevices();
      req.onsuccess = function bt_getPairedSuccess() {
        //pairIndex = req.result;
        pairIndex[0] = {name: 'headset', address: '87:32:43:19:2C:51'};
        pairIndex[1] = {name: 'evelyn', address: '88:53:46:77:0F:53'};
        var length = pairIndex.length;
        for (var i = 0; i < length; i++) {
          dump("==== paired: "+pairIndex[i].name);
          pairList.appendChild(newListItem(pairIndex[i]));
        }
        var text = pairIndex[0].name;
        if (length > 1) {
          text += ", +" + (length -1) + " "+ _('bt-status-pairmore');
        }
        gBluetoothInfoBlock.textContent = text;
      };
    }

    function startDiscovery() {
      if (!defaultAdapter)
        return;

      var req = defaultAdapter.startDiscovery();
      req.onsuccess = function bt_discoveryStart() {
        searchAgainBtn.hidden = true;
        setTimeout(stopDiscovery, 60000);
      };
      req.onerror = function bt_discoveryFailed() {
        searchingItem.hidden = true;
        searchAgainBtn.hidden = false;
      };
    }

    function stopDiscovery() {
      if (!defaultAdapter)
        return;

      var req = defaultAdapter.stopDiscovery();
      req.onsuccess = function bt_discoveryStopped() {
        searchAgainBtn.hidden = false;
        searchingItem.hidden = true;
      };
      req.onerror = function bt_discoveryStopFailed() {
        searchAgainBtn.hidden = true;
        searchingItem.hidden = false;
      };
    }

    // API
    return {
      update: updateDeviceList,
      initWithAdapter: initial,
      startDiscovery: startDiscovery,
      onDeviceFound: onDeviceFound,
      onRequestConfirmation: onRequestConfirmation
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
    if (enabled) {
      //XXX there is no "bluetooth.onenabled" callback can be hooked.
      //https://bugzilla.mozilla.org/show_bug.cgi?id=782586
      if (!bluetooth.enabled) {
        setTimeout(initialDefaultAdapter, 5000);
      } else {
        initialDefaultAdapter();
      }
    }
  }

});

