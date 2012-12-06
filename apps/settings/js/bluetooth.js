/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * gDeviceList is defined here because the child window created for pairing
 * requests needs to access its method via window.opener
 */

var gDeviceList = null;

// handle Bluetooth settings
onLocalized(function bluetoothSettings() {
  var _ = navigator.mozL10n.get;
  var settings = window.navigator.mozSettings;
  var bluetooth = window.navigator.mozBluetooth;
  var defaultAdapter = null;

  if (!settings || !bluetooth) {
    return;
  }

  var gBluetoothInfoBlock = document.getElementById('bluetooth-desc');
  var gBluetoothCheckBox = document.querySelector('#bluetooth-status input');
  var gBluetoothRename = document.getElementById('bluetooth-rename');
  var gBluetoothSearch = document.getElementById('bluetooth-search');

  // display Bluetooth power state
  function updateBluetoothState(value) {
    gBluetoothInfoBlock.textContent =
      value ? _('bt-status-nopaired') : _('bt-status-turnoff');
    gBluetoothCheckBox.checked = value;
    gBluetoothRename.hidden = !value;
    gBluetoothSearch.hidden = !value;
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
    };
  }

  // device information
  var gMyDeviceInfo = (function deviceInfo() {
    var visibleItem = document.getElementById('device-visible');
    var visibleName = document.getElementById('bluetooth-device-name');
    var visibleCheckBox = document.querySelector('#device-visible input');
    var renameButton = document.getElementById('rename-device');

    var visibleTimeout = null;
    var myName = '';

    visibleCheckBox.onchange = function changeDiscoverable() {
      setDiscoverable(this.checked);
    };

    renameButton.onclick = function renameBtnClicked() {
      if (myName === '') {
        myName = visibleName.textContent = defaultAdapter.name;
      }

      var nameEntered = window.prompt(_('change-phone-name'), myName);
      if (!nameEntered || nameEntered === '' || nameEntered === myName)
        return;

      var req = defaultAdapter.setName(nameEntered);
      req.onsuccess = function bt_renameSuccess() {
        myName = visibleName.textContent = defaultAdapter.name;
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
          setDiscoverable(visible);
        };
        req.onerror = function bt_getVisibleError() {
          visibleCheckBox.checked = true;
        };
      } else {
        visibleItem.hidden = true;
        renameButton.disabled = true;
        if (visibleTimeout) {
          clearTimeout(visibleTimeout);
          visibleTimeout = null;
        }
      }
    }

    // initial this device information and do default actions
    // when DefaultAdapter is ready.
    function initial() {
      setDiscoverable(visibleCheckBox.checked);
      // we can't get device name immediately, wait a while
      setTimeout(function() {
        myName = visibleName.textContent = defaultAdapter.name;
        renameButton.disabled = false;
      }, 1000);
    }

    function setDiscoverable(visible) {
      settings.createLock().set({'bluetooth.visible': visible});
      if (!defaultAdapter)
        return;

      defaultAdapter.setDiscoverable(visible);
      // Visibility will time out after 2 mins.
      if (visible) {
        if (!visibleTimeout) {
          visibleTimeout = setTimeout(function() {
              setDiscoverable(false);
            }, 120000);
        }
      } else {
        if (visibleTimeout) {
          clearTimeout(visibleTimeout);
          visibleTimeout = null;
        }
      }
      visibleCheckBox.checked = visible;
    }

    // API
    return {
      update: updateDeviceInfo,
      initWithAdapter: initial
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
      show: function showArea(isShown) {
        if (!isShown) {
          this.clear();
        }
        this.title.hidden = !isShown;
        this.list.hidden = !isShown;
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
      show: function showArea(isShown) {
        if (!isShown) {
          this.clear();
        }
        this.title.hidden = !isShown;
        this.list.hidden = !isShown;
      }
    };

    var optionMenu = {
      menu: document.getElementById('paired-device-option'),
      connectOpt: document.getElementById('connect-option'),
      disconnectOpt: document.getElementById('disconnect-option'),
      unpairOpt: document.getElementById('unpair-option'),

      show: function showMenu(device) {
        var self = this;
        // we only support audio-card device to connect atm
        if (device.icon === 'audio-card') {
          if (connectedAddress && device.address === connectedAddress) {
            this.connectOpt.style.display = 'none';
            this.disconnectOpt.style.display = 'block';
            this.disconnectOpt.onclick = function() {
              setDeviceDisconnect(device);
            };
          } else {
            this.connectOpt.style.display = 'block';
            this.disconnectOpt.style.display = 'none';
            this.connectOpt.onclick = function() {
              setDeviceConnect(device);
              stopDiscovery();
            };
          }
        } else {
          this.connectOpt.style.display = 'none';
          this.disconnectOpt.style.display = 'none';
        }
        this.unpairOpt.onclick = function() {
          setDeviceUnpair(device);
        };
        this.menu.onsubmit = function closeMenu() {
          return self.close();
        }
        this.menu.hidden = false;
      },

      close: function closeMenu() {
        this.menu.hidden = true;
        return false;
      }
    };

    var searchAgainBtn = document.getElementById('search-device');
    var searchingItem = document.getElementById('bluetooth-searching');
    var enableMsg = document.getElementById('bluetooth-enable-msg');
    var childWindow = null;

    var pairingMode = 'active';
    var pairingAddress = null;
    var connectingAddress = null;
    var connectedAddress = null;
    var discoverTimeout = null;

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
      li.classList.add('bluetooth-device');
      li.classList.add('bluetooth-type-' + device.icon);
      li.appendChild(deviceDesc); // should append this first
      li.appendChild(deviceName);

      return li;
    }

    // immediatly UI update, DOM element manipulation.
    function updateDeviceList(show) {
      if (show) {
        enableMsg.hidden = true;
        openList.show(true);
        searchingItem.hidden = false;
      } else {
        openList.show(false);
        pairList.show(false);
        enableMsg.hidden = false;
        searchingItem.hidden = true;
        optionMenu.close();
        stopDiscovery();
      }
    }

    // do default actions (start discover avaliable devices)
    // when DefaultAdapter is ready.
    function initial() {
      // Bind message handler for incoming pairing requests
      navigator.mozSetMessageHandler('bluetooth-requestconfirmation',
        function bt_gotConfirmationMessage(message) {
          onRequestPairing(message, 'confirmation');
        }
      );

      navigator.mozSetMessageHandler('bluetooth-requestpincode',
        function bt_gotPincodeMessage(message) {
          onRequestPairing(message, 'pincode');
        }
      );

      navigator.mozSetMessageHandler('bluetooth-requestpasskey',
        function bt_gotPasskeyMessage(message) {
          onRequestPairing(message, 'passkey');
        }
      );

      navigator.mozSetMessageHandler('bluetooth-cancel',
        function bt_gotCancelMessage(message) {
          showDevicePaired(false);
        }
      );

      navigator.mozSetMessageHandler('bluetooth-pairedstatuschanged',
        function bt_getPairedMessage(message) {
          showDevicePaired(message.paired);
        }
      );

      navigator.mozSetMessageHandler('bluetooth-hfp-status-changed',
        function bt_getConnectedMessage(message) {
          showDeviceConnected(message.address, message.connected);
        }
      );

      getPairedDevice();
      startDiscovery();
    }

    function getPairedDevice() {
      var req = defaultAdapter.getPairedDevices();
      req.onsuccess = function bt_getPairedSuccess() {
        // copy for sorting
        var paired = req.result.slice();
        var length = paired.length;
        if (length == 0) {
          gBluetoothInfoBlock.textContent = _('bt-status-nopaired');
          pairList.show(false);
          return;
        }
        pairList.clear();
        paired.sort(function(a, b) {
          return a.name > b.name;
        });
        for (var i = 0; i < length; i++) {
          (function(device) {
            var state = (device.address === connectedAddress) ?
              _('device-status-connected') : '';
            var aItem = newListItem(device, state);
            aItem.onclick = function() {
              optionMenu.show(device);
            };
            pairList.list.appendChild(aItem);
            pairList.index[device.address] = [device, aItem];
            // if the device has to be connected when it just paired
            // wait for a while so they can have time to communicate
            // their connection protocol
            if (device.address === connectingAddress &&
                device.icon === 'audio-card') {
              aItem.querySelector('small').textContent =
                _('device-status-connecting');
              setTimeout(function() {
                setDeviceConnect(device);
              }, 5000);
            }
          })(paired[i]);
        }
        var text = _('bt-status-paired', {
          name: paired[0].name,
          n: length - 1
        });
        gBluetoothInfoBlock.textContent = text;
        pairList.show(true);
      };
    }

    // callback function when an avaliable device found
    function onDeviceFound(evt) {
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
        stopDiscovery();
        req.onerror = function bt_pairError() {
          showDevicePaired(false);
        };

      };
      openList.list.appendChild(aItem);
      openList.index[device.address] = [device, aItem];
    }

    function showDevicePaired(paired) {
      // if we are in a pairing process, update found device list
      // or do error handling.
      if (pairingAddress) {
        if (paired) {
          // if the device is on the list, remove it.
          // it will show on paired list later.
          if (openList.index[pairingAddress]) {
            var device = openList.index[pairingAddress][0];
            var item = openList.index[pairingAddress][1];
            openList.list.removeChild(item);
            connectingAddress = pairingAddress;
          }
        } else {
          // if the attention screen still open, close it
          if (childWindow)
            childWindow.close();
          // show pair process fail.
          var msg = _('error-pair-title') + '\n' + _('error-pair-pincode');
          // display failure only when active request
          if (pairingMode === 'active')
            window.alert(msg);
          // rollback device status
          if (openList.index[pairingAddress]) {
            var item = openList.index[pairingAddress][1];
            item.querySelector('small').textContent =
              _('device-status-tap-connect');
          }
        }
        pairingAddress = null;
      }
      // acquire a new paired list no matter paired or unpaired
      getPairedDevice();
    }

    function setDeviceUnpair(device) {
      if (device.address === connectedAddress) {
        var msg = _('unpair-title') + '\n' + _('unpair-msg');
        if (!window.confirm(msg))
          return;
        connectedAddress = null;
      }
      // backend takes responsibility to disconnect first.
      var req = defaultAdapter.unpair(device);
      req.onerror = function bt_pairError() {
        showDevicePaired(true);
      };
    }

    function setDeviceDisconnect(device) {
      if (device.address !== connectedAddress)
        return;

      // '0x111E' is a service id to distigush connection type.
      // https://www.bluetooth.org/Technical/AssignedNumbers/service_discovery.htm
      var req = defaultAdapter.disconnect(0x111E);
      req.onerror = function() {
        showDeviceConnected(device.address, true);
      };
    }

    function setDeviceConnect(device) {
      // we only support audio-card device to connect now
      if (!defaultAdapter || device.icon !== 'audio-card') {
        connectingAddress = null;
        return;
      }

      // disconnect current connected device first
      if (connectedAddress && device.address !== connectedAddress) {
        setDeviceDisconnect(pairList.index[connectedAddress][0]);
      }

      // '0x111E' is a service id to distigush connection type.
      // https://www.bluetooth.org/Technical/AssignedNumbers/service_discovery.htm
      var req = defaultAdapter.connect(device.address, 0x111E);
      req.onerror = function() {
        window.alert(_('error-connect-msg'));
        showDeviceConnected(connectingAddress, false);
        connectingAddress = null;
      };
      connectingAddress = device.address;
      var item = pairList.index[connectingAddress][1];
      item.querySelector('small').textContent = _('device-status-connecting');
    }

    function showDeviceConnected(deviceAddress, connected) {
      if (connected) {
        connectedAddress = deviceAddress;
      } else {
        if (connectedAddress === deviceAddress)
          connectedAddress = null;
      }
      var item = pairList.index[deviceAddress][1];
      item.querySelector('small').textContent = (connected) ?
        _('device-status-connected') : '';
    }

    function onRequestPairing(evt, method) {
      var device = {
        address: evt.address,
        name: evt.name || _('unnamed-device'),
        icon: evt.icon || 'bluetooth-default'
      };

      if (device.address !== pairingAddress) {
        pairingAddress = device.address;
        pairingMode = 'passive';
      }
      var passkey = evt.passkey || null;
      var protocol = window.location.protocol;
      var host = window.location.host;
      childWindow = window.open(protocol + '//' + host + '/onpair.html',
                  'pair_screen', 'attention');
      childWindow.onload = function childWindowLoaded() {
        childWindow.PairView.init(pairingMode, method, device, passkey);
      };
    }

    function startDiscovery() {
      if (!defaultAdapter)
        return;

      var req = defaultAdapter.startDiscovery();
      req.onsuccess = function bt_discoveryStart() {
        searchAgainBtn.disabled = true;
        if (!discoverTimeout)
          discoverTimeout = setTimeout(stopDiscovery, 60000);
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
      clearTimeout(discoverTimeout);
      discoverTimeout = null;
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
      setPasskey: setPasskey,
      onRequestPairing: onRequestPairing
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

    gDeviceList.update(enabled);
    gMyDeviceInfo.update(enabled);

    // clear defaultAdapter, we have to acquire it again when enabled.
    if (!enabled)
      defaultAdapter = null;

  });

  // startup, update status
  var req = settings.createLock().get('bluetooth.enabled');

  req.onsuccess = function bt_getSettingsSuccess() {
    lastMozSettingValue = req.result['bluetooth.enabled'];

    // if bluetooth is on when booting, the adapter probably is ready.
    if (lastMozSettingValue)
      initialDefaultAdapter();

    updateBluetoothState(lastMozSettingValue);

    gDeviceList.update(lastMozSettingValue);
    gMyDeviceInfo.update(lastMozSettingValue);
  };

  bluetooth.onadapteradded = function bt_adapterAdded() {
    initialDefaultAdapter();
  };
});

