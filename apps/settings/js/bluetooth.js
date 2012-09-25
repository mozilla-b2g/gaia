/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * gDeviceList here because child window created for pair request
 * needs to access its method via window.opener
 */

var gDeviceList = null;

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
    settings.createLock().set({'bluetooth.enabled': this.checked});
  };

  function initialDefaultAdapter() {
    if (!bluetooth.enabled)
      return;
    var req = bluetooth.getDefaultAdapter();
    req.onsuccess = function bt_getAdapterSuccess() {
      defaultAdapter = req.result;
      if (defaultAdapter == null) {
        // we can do nothing without DefaultAdapter, so set bluetooth disabled
        settings.createLock().set({'bluetooth.enabled': false});
        return;
      }
      defaultAdapter.ondevicefound = gDeviceList.onDeviceFound;

      // initial related components that need defaultAdapter.
      gMyDeviceInfo.initWithAdapter();
      gDeviceList.initWithAdapter();
    };
    req.onerror = function bt_getAdapterFailed() {
      // we can do nothing without DefaultAdapter, so set bluetooth disabled
      settings.createLock().set({'bluetooth.enabled': false});
    }
  }

  // device information
  var gMyDeviceInfo = (function deviceInfo() {
    var visibleItem = document.querySelector('#bluetooth-visible-device');
    var visibleName = document.querySelector('#bluetooth-device-name');
    var visibleCheckBox =
      document.querySelector('#bluetooth-visible-device input');
    var advancedItem = document.querySelector('#bluetooth-advanced');
    var renameButton = document.querySelector('#bluetooth-rename-btn button');
    var myName = '';

    visibleCheckBox.onchange = function changeDiscoverable() {
      settings.createLock().set({'bluetooth.visible': this.checked});
      setDiscoverable(this.checked);
    };

    renameButton.onclick = function renameBtnClicked() {
      var nameEntered = window.prompt(_('bluetoothRename'), myName);
      if (!nameEntered || nameEntered === '' || nameEntered === myName)
        return;

      var req = defaultAdapter.setName(nameEntered);
      req.onsuccess = function bt_renameSuccess() {
        myName = visibleName.textContent = defaultAdapter.name;
        return close();
      }
    };

    // immediatly UI update, DOM element manipulation.
    function updateDeviceInfo(show) {
      if (show) {
        advancedItem.hidden = false;
        visibleItem.hidden = false;
        // get last user setting for device visible
        var req = settings.createLock().get('bluetooth.visible');
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
  gDeviceList = (function deviceList() {
    var pairList = {
      showlist: document.getElementById('bluetooth-show-paired-devices'),
      list: document.getElementById('bluetooth-paired-devices'),
      index: [],
      clear: function emptyList() {
        while (this.list.hasChildNodes()) {
          this.list.removeChild(this.list.lastChild);
        }
        while (this.showlist.hasChildNodes()) {
          this.showlist.removeChild(this.showlist.lastChild);
        }
        this.index = [];
      }
    };
    var openList = {
      list: document.getElementById('bluetooth-devices'),
      index: [],
      clear: function emptyList() {
        while (this.list.hasChildNodes()) {
          this.list.removeChild(this.list.lastChild);
        }
        this.index = [];
      }
    };
    var searchAgainBtn = document.querySelector('#bluetooth-search-again');
    var searchingItem = document.querySelector('#bluetooth-searching');
    var enableMsg = document.querySelector('#bluetooth-enable-msg');
    var childWindow = null;

    searchAgainBtn.onclick = function searchAgainClicked() {
      updateDeviceList(true); // reset network list
      openList.clear();
      startDiscovery();
    };

    // private DOM helper: create a device list item
    function newListItem(device, desc) {
      var deviceName = document.createElement('a');
      var aName = (device.name === '') ? _('unnamed') : device.name;
      deviceName.textContent = aName;

      var deviceDesc = document.createElement('small');
      deviceDesc.textContent = desc;

      var li = document.createElement('li');
      li.appendChild(deviceDesc); // should append this first
      li.appendChild(deviceName);

      return li;
    }


    // immediatly UI update, DOM element manipulation.
    function updateDeviceList(show) {
      if (show) {
        enableMsg.hidden = true;
        searchingItem.hidden = false;

      } else {
        openList.clear();
        pairList.clear();
        enableMsg.hidden = false;
        searchingItem.hidden = true;
      }
    }

    // do default actions (start discover avaliable devices)
    // when DefaultAdapter is ready.
    function initial() {
      // Bind message handler for incoming pairing requests
      navigator.mozSetMessageHandler('bluetooth-requestconfirmation',
        function bt_gotConfirmationMessage(message) {
          onRequestConfirmation(message);
        }
      );
      navigator.mozSetMessageHandler('bluetooth-requestpincode',
        function bt_gotPincodeMessage(message) {
          onRequestPincode(message);
        }
      );

      navigator.mozSetMessageHandler('bluetooth-requestpasskey',
        function bt_gotPasskeyMessage(message) {
          onRequestPasskey(message);
        }
      );

      navigator.mozSetMessageHandler('bluetooth-cancel',
        function bt_gotCancelMessage(message) {
          if (childWindow) {
            childWindow.close();
          }
          aItem.querySelector('small').textContent = device.address;
          //XXX show a "pair failed" alert
        }
      );

      getPairedDevice();
      startDiscovery();
    }

    // callback function when an avaliable device found
    function onDeviceFound(evt) {
      // check duplicate
      var device = evt.device;
      if (findDevice(openList.index, device.address))
        return;

      // paired device has been shown on the top.
      if (findDevice(pairList.index, device.address))
        return;

      var aItem = newListItem(device, device.address);

      // bind paired callback
      aItem.onclick = function() {
        aItem.querySelector('small').textContent = _('device-status-pairing');
        var req = defaultAdapter.pair(device);
        req.onsuccess = function bt_pairSuccess() {
          getPairedDevice();
          aItem.parentNode.removeChild(aItem);
        };
        req.onerror = function bt_pairError() {
          if (childWindow) {
            childWindow.close();
          }
          aItem.querySelector('small').textContent = device.address;
          //XXX show a "pair failed" alert
        };
      };
      openList.list.appendChild(aItem);
      openList.index.push(evt.device);
    }

    function findDevice(list, address) {
      var i = list.length - 1;
      while (i >= 0) {
        if (list[i].address === address) {
          return list[i];
        }
        i -= 1;
      }
      return null;
    }

    function onRequestConfirmation(evt) {
      var device = findDevice(openList.index, evt.deviceAddress);
      if (!device)
        return;
      var passkey = evt.passkey;
      var protocol = window.location.protocol;
      var host = window.location.host;
      // XXX use attention screen first, need to confirm with UX.
      childWindow = window.open(protocol + '//' + host + '/onpair.html',
                  'pair_screen', 'attention');
      childWindow.onload = function() {
        childWindow.PairView.init('confirmation', device, passkey);
      };
    }

    function onRequestPincode(evt) {
      var device = findDevice(openList.index, evt.deviceAddress);
      if (!device)
        return;
      var protocol = window.location.protocol;
      var host = window.location.host;
      childWindow = window.open(protocol + '//' + host + '/onpair.html',
                  'pair_screen', 'attention');
      childWindow.onload = function() {
        childWindow.PairView.init('pincode', device);
      };
    }

    function onRequestPasskey(evt) {
      var device = findDevice(openList.index, evt.deviceAddress);
      if (!device)
        return;
      var protocol = window.location.protocol;
      var host = window.location.host;
      childWindow = window.open(protocol + '//' + host + '/onpair.html',
                  'pair_screen', 'attention');
      childWindow.onload = function() {
        childWindow.PairView.init('passkey', device);
      };
    }

    function getPairedDevice() {
      pairList.clear();
      var req = defaultAdapter.getPairedDevices();
      req.onsuccess = function bt_getPairedSuccess() {
        pairList.index = req.result;
        var length = pairList.index.length;
        if (length == 0)
          return;
        for (var i = 0; i < length; i++) {
          (function(device) {
            var aItem = newListItem(device, _('device-status-paired'));
            aItem.onclick = function() {
              var req = defaultAdapter.unpair(device);
              req.onsuccess = function bt_pairSuccess() {
                getPairedDevice();
                onDeviceFound({device: device});
              };
              req.onerror = function bt_pairError() {
              };
            };
            pairList.list.appendChild(aItem);
            pairList.showlist.appendChild(aItem.cloneNode(true));
          })(pairList.index[i]);
        }
        var text = pairList.index[0].name;
        if (length > 1) {
          text += ', +' + (length - 1) + ' ' + _('bt-status-pairmore');
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

    function setPairingConfirmation(address) {
      if (!defaultAdapter)
        return;
      defaultAdapter.setPairingConfirmation(address, true);
    }

    function setPinCode(address, pincode) {
      if (!defaultAdapter)
        return;
      defaultAdapter.setPinCode(address, pincode);
    }

    function setPasskey(address, passkey) {
      if (!defaultAdapter)
        return;
      var key = parseInt(passkey, 10);
      defaultAdapter.setPasskey(address, key);
    }

    // API
    return {
      update: updateDeviceList,
      initWithAdapter: initial,
      startDiscovery: startDiscovery,
      onDeviceFound: onDeviceFound,
      setPairingConfirmation: setPairingConfirmation,
      setPinCode: setPinCode,
      setPasskey: setPasskey
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
  var req = settings.createLock().get('bluetooth.enabled');

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

