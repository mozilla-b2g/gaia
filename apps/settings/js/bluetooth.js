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

  if (!settings || !bluetooth) {
    return;
  }

  var gBluetoothInfoBlock = document.getElementById('bluetooth-desc');
  var gBluetoothCheckBox = document.querySelector('#bluetooth-status input');
  var gBluetoothOptions = document.getElementById('bluetooth-options');

  // display Bluetooth power state
  function updateBluetoothState(value) {
    gBluetoothInfoBlock.textContent =
      value ? _('bt-status-nopaired') : _('bt-status-turnoff');
    gBluetoothCheckBox.checked = value;
    gBluetoothOptions.hidden = !value;
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
    var visibleItem = document.getElementById('device-visible');
    var visibleName = document.getElementById('bluetooth-device-name');
    var visibleCheckBox = document.querySelector('#device-visible input');
    var renameButton = document.getElementById('rename-device');

    //XXX get myName from mozSettings and set it back to device
    var myName = '';

    visibleCheckBox.onchange = function changeDiscoverable() {
      settings.createLock().set({'bluetooth.visible': this.checked});
      setDiscoverable(this.checked);
    };

    renameButton.onclick = function renameBtnClicked() {
      var nameEntered = window.prompt(_('change-phone-name'), myName);
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
        visibleItem.hidden = true;
        renameButton.disabled = true;
      }
    }

    // initial this device information and do default actions
    // when DefaultAdapter is ready.
    function initial() {
      setDiscoverable(visibleCheckBox.checked);
      myName = visibleName.textContent = defaultAdapter.name;
      renameButton.disabled = false;
    }

    function setDiscoverable(visible) {
      if (!defaultAdapter) {
        return;
      }
      defaultAdapter.setDiscoverable(visible);
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
      title: document.getElementById('bluetooth-paired-title'),
      list: document.getElementById('bluetooth-paired-devices'),
      index: [],
      clear: function emptyList() {
        while (this.list.hasChildNodes()) {
          this.list.removeChild(this.list.lastChild);
        }
        this.index = [];
      },
      show: function hideArea(isShow) {
        if (!isShow) {
          this.clear();
        }
        this.title.hidden = !isShow;
        this.list.hidden = !isShow;
      }
    };
    var openList = {
      title: document.getElementById('bluetooth-found-title'),
      list: document.getElementById('bluetooth-devices'),
      index: [],
      clear: function emptyList() {
        while (this.list.hasChildNodes()) {
          this.list.removeChild(this.list.lastChild);
        }
        this.index = [];
      },
      show: function hideArea(isShow) {
        if (!isShow) {
          this.clear();
        }
        this.title.hidden = !isShow;
        this.list.hidden = !isShow;
      }
    };
    var searchAgainBtn = document.getElementById('search-device');
    var searchingItem = document.getElementById('bluetooth-searching');
    var enableMsg = document.getElementById('bluetooth-enable-msg');
    var childWindow = null;

    var pairingAddress = '';
    var connectingAddress = '';
    var pairingMode = 'active';

    searchAgainBtn.onclick = function searchAgainClicked() {
      updateDeviceList(true); // reset network list
      openList.clear();
      startDiscovery();
    };

    // private DOM helper: create a device list item
    function newListItem(device, desc) {
      var deviceName = document.createElement('a');
      var aName = (device.name === '') ? _('unnamed-device') : device.name;
      deviceName.textContent = aName;

      var deviceDesc = document.createElement('small');
      deviceDesc.textContent = desc;

      var li = document.createElement('li');
      //XXX add attribute for icon
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
        openList.show(false);
        pairList.show(false);
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
          dump("==== pair failed: oncancel");
          if (childWindow)
            childWindow.PairView.pairFailed();
//        aItem.querySelector('small').textContent = _('device-status-tap-connect');
          //XXX need to put more content into alert popup
        }
      );

      getPairedDevice();
      startDiscovery();
    }

    function getPairedDevice() {
      var req = defaultAdapter.getPairedDevices();
      req.onsuccess = function bt_getPairedSuccess() {
        var paired = req.result;
        var length = paired.length;
        if (length == 0) {
          pairList.show(false);
          return;
        }
        pairList.clear();
        //XXX sort by alpha order
        for (var i = 0; i < length; i++) {
          (function(device) {
            var state = (device.address === connectingAddress) ?
              _('device-status-connecting') : '';
            var aItem = newListItem(device, state);
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
            pairList.index[device.address] = aItem;
          })(paired[i]);
        }
        var text = paired[0].name;
        if (length > 1) {
          text += _('bt-status-pairmore', {n: length - 1});
        }
        gBluetoothInfoBlock.textContent = text;
        pairList.show(true);
      };
    }

    // callback function when an avaliable device found
    function onDeviceFound(evt) {
      dump("==== on device found" + evt.device.name);
      var device = evt.device;
      // ignore duplicate and paired device
      if (openList.index[device.address] || pairList.index[device.address])
        return;

      var aItem = newListItem(device, _('device-status-tap-connect'));

      // bind paired callback
      aItem.onclick = function() {
        aItem.querySelector('small').textContent = _('device-status-pairing');
        var req = defaultAdapter.pair(device);
        pairingMode = 'active';
        pairingAddress = device.address;
        //XXX https://bugzilla.mozilla.org/show_bug.cgi?id=791182
        //we may not hook onsuccess anymore, but listen to an event instead.
        req.onsuccess = function bt_pairSuccess() {
          if (childWindow)
            childWindow.close();
          //XXX we have to ask for connect, use connectingAddress
          connectingAddress = pairingAddress;
          getPairedDevice();
          aItem.parentNode.removeChild(aItem);
        };
        req.onerror = function bt_pairError() {
          dump("==== pair failed: onerror");
          if (childWindow)
            childWindow.PairView.pairFailed();
          aItem.querySelector('small').textContent = _('device-status-tap-connect');
        };
      };
      openList.list.appendChild(aItem);
      openList.index[device.address] = aItem;
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
      var device = {
        address: evt.deviceAddress, 
        name: evt.deviceName || _('unnamed-device'),
        icon: evt.deviceIcon || '',
      };

      if (evt.deviceAddress !== pairingAddress) {
        pairingAddress = evt.deviceAddress;
        pairingMode = 'passive';
      }
      var passkey = evt.passkey;
      var protocol = window.location.protocol;
      var host = window.location.host;
      // XXX detect lock screen status
      childWindow = window.open(protocol + '//' + host + '/onpair.html',
                  'pair_screen', 'attention');
      //XXX should pass pairingMode to display correct message.
      childWindow.onload = function() {
        childWindow.PairView.setUp(pairingMode, 'confirmation', device, passkey);
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
        childWindow.PairView.setUp(pairingMode, 'pincode', device);
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
        childWindow.PairView.setUp(pairingMode, 'passkey', device);
      };
    }


    function startDiscovery() {
      if (!defaultAdapter)
        return;

      var req = defaultAdapter.startDiscovery();
      req.onsuccess = function bt_discoveryStart() {
        dump("==== start discovery success");
        openList.show(true);
        searchAgainBtn.disabled = true;
        setTimeout(stopDiscovery, 60000);
      };
      req.onerror = function bt_discoveryFailed() {
        searchingItem.hidden = true;
        searchAgainBtn.disabled = false;
      };
    }

    function stopDiscovery() {
      if (!defaultAdapter)
        return;

      var req = defaultAdapter.stopDiscovery();
      req.onsuccess = function bt_discoveryStopped() {
        searchAgainBtn.disabled = false;
        searchingItem.hidden = true;
      };
      req.onerror = function bt_discoveryStopFailed() {
        searchAgainBtn.disabled = true;
        searchingItem.hidden = false;
      };
    }

    function setConfirmation(address) {
      if (!defaultAdapter)
        return;
      var req = defaultAdapter.setPairingConfirmation(address, true);
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
      setConfirmation: setConfirmation,
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

  req.onsuccess = function bt_getSettingsSuccess() {
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

