/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * gDeviceList is defined here because the child window created for pairing
 * requests needs to access its method via window.opener
 */

var gDeviceList = null;

// handle Bluetooth settings
navigator.mozL10n.ready(function bluetoothSettings() {
  // Service ID for profiles
  var Profiles = {
    'HFP': 0x111E,
    'A2DP': 0x110D
  };

  var _ = navigator.mozL10n.get;
  var l10n = navigator.mozL10n;
  var settings = Settings.mozSettings;
  var bluetooth = getBluetooth();
  var defaultAdapter = null;

  var MAX_DEVICE_NAME_LENGTH = 20;

  if (!settings || !bluetooth) {
    return;
  }

  var gBluetoothCheckBox = document.querySelector('#bluetooth-status input');

  // display Bluetooth power state
  function updateBluetoothState(value) {
    gBluetoothCheckBox.checked = value;
  }

  // activate main button
  gBluetoothCheckBox.onchange = function changeBluetooth() {
    var req = settings.createLock().set({'bluetooth.enabled': this.checked});
    this.disabled = true;
    req.onerror = function() {
      gBluetoothCheckBox.disabled = false;
    };
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
    var bluetoothRename = document.getElementById('bluetooth-rename');
    var renameButton = document.getElementById('rename-device');
    var updateNameDialog = document.getElementById('update-device-name');
    var updateNameInput = document.getElementById('update-device-name-input');
    var updateNameCancelButton =
        document.getElementById('update-device-name-cancel');
    var updateNameConfirmButton =
        document.getElementById('update-device-name-confirm');

    var visibleTimeout = null;
    var visibleTimeoutTime = 120000;  // visibility will timeout after 2 minutes
    var myName = '';

    visibleCheckBox.onchange = function changeDiscoverable() {
      setDiscoverable(this.checked);
    };

    renameButton.onclick = function renameBtnClicked() {
      if (myName === '') {
        myName = visibleName.textContent = defaultAdapter.name;
      }
      updateNameInput.value = myName;
      updateNameDialog.hidden = false;
    };

    updateNameCancelButton.onclick = function updateNameCancelClicked(evt) {
      updateNameDialog.hidden = true;
    };

    updateNameConfirmButton.onclick = function updateNameConfirmClicked(evt) {
      var nameEntered = updateNameInput.value;
      nameEntered = nameEntered.replace(/^\s+|\s+$/g, '');

      if (nameEntered.length > MAX_DEVICE_NAME_LENGTH) {
        var wantToRetry = window.confirm(_('bluetooth-name-maxlength-alert',
              { length: MAX_DEVICE_NAME_LENGTH }));

        if (!wantToRetry) {
          updateNameDialog.hidden = true;
        }
        return;
      }

      if (nameEntered === myName || !bluetooth.enabled || !defaultAdapter) {
        updateNameDialog.hidden = true;
        return;
      }

      if (nameEntered !== '') {
        updateDeviceName(nameEntered);
      }
      else {
        // Bug 847459: Default name of the bluetooth device is set by bluetoothd
        // to the value of the Android ro.product.model property upon first
        // start. In case the user gives an empty bluetooth device name, we want
        // to revert to the original ro.product.model. Gecko exposes it under
        // the deviceinfo.product_model setting.
        var deviceInfo = settings.createLock().get('deviceinfo.product_model');
        deviceInfo.onsuccess = function bt_getProductModel() {
          var productModel = deviceInfo.result['deviceinfo.product_model'];
          updateDeviceName(productModel);
        };
      }

      updateNameDialog.hidden = true;
    };

    function updateDeviceName(nameEntered) {
      var req = defaultAdapter.setName(nameEntered);

      req.onsuccess = function bt_renameSuccess() {
        myName = visibleName.textContent = defaultAdapter.name;
      };
    }

    // immediatly UI update, DOM element manipulation.
    function updateDeviceInfo(show) {
      bluetoothRename.hidden = !show;
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
      visibleCheckBox.checked = defaultAdapter.discoverable;
      setDiscoverable(visibleCheckBox.checked);
      // we can't get device name immediately, wait a while
      setTimeout(function() {
        myName = visibleName.textContent = defaultAdapter.name;
        renameButton.disabled = false;
      }, 1000);
    }

    function setDiscoverable(visible) {
      if (!bluetooth.enabled || !defaultAdapter)
        return;

      settings.createLock().set({'bluetooth.visible': visible});

      defaultAdapter.setDiscoverable(visible);
      // Visibility will time out after 2 mins.
      if (visible) {
        if (!visibleTimeout) {
          visibleTimeout = setTimeout(function() {
              setDiscoverable(false);
            }, visibleTimeoutTime);
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
    var bluetoothSearch = document.getElementById('bluetooth-search');
    var searchAgainBtn = document.getElementById('search-device');
    var searchingItem = document.getElementById('bluetooth-searching');
    var enableMsg = document.getElementById('bluetooth-enable-msg');
    var childWindow = null;

    var pairingMode = 'active';
    var userCanceledPairing = false;
    var pairingAddress = null;
    var connectingAddress = null;
    var connectedAddress = null;
    // stop discover other device after 60 seconds
    var discoverTimeoutTime = 60000;
    var discoverTimeout = null;

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
      confirmDlg: document.getElementById('unpair-device'),
      confirmOpt: document.getElementById('confirm-option'),

      showActions: function showActions() {
        var self = this;
        if (connectedAddress && this.device.address === connectedAddress) {
          this.connectOpt.style.display = 'none';
          this.disconnectOpt.style.display = 'block';
          this.disconnectOpt.onclick = function() {
            setDeviceDisconnect(self.device);
          };
        } else {
          this.connectOpt.style.display = 'block';
          this.disconnectOpt.style.display = 'none';
          this.connectOpt.onclick = function() {
            setDeviceConnect(self.device);
          };
        }
        this.unpairOpt.onclick = function() {
          setDeviceUnpair(self.device);
        };
        this.menu.onsubmit = function closeMenu() {
          return self.close();
        };
        this.menu.hidden = false;
      },

      showConfirm: function showConfirm() {
        var self = this;
        this.confirmDlg.onclick = function() {
          return self.close();
        };
        this.confirmOpt.onclick = function() {
          setDeviceUnpair(self.device);
        };
        this.confirmDlg.hidden = false;
      },

      show: function showMenu(device) {
        this.device = device;
        // we only support audio-card device to connect atm
        this[this.device.icon === 'audio-card' ?
          'showActions' : 'showConfirm']();
      },

      close: function closeMenu() {
        this.menu.hidden = true;
        this.confirmDlg.hidden = true;
        return false;
      }
    };

    searchAgainBtn.onclick = function searchAgainClicked() {
      updateDeviceList(true); // reset network list
      openList.clear();
      startDiscovery();
    };

    // private DOM helper: create a device list item
    function newListItem(device, descL10nId) {
      var deviceName = document.createElement('a');
      if (device.name !== '') {
        deviceName.textContent = device.name;
        deviceName.dataset.l10nId = '';
      } else {
        l10n.localize(deviceName, 'unnamed-device');
      }

      var deviceDesc = document.createElement('small');
      if (descL10nId) {
        l10n.localize(deviceDesc, descL10nId);
      } else {
        deviceDesc.textContent = '';
        deviceDesc.dataset.l10nId = '';
      }

      var li = document.createElement('li');
      li.classList.add('bluetooth-device');
      li.classList.add('bluetooth-type-' + device.icon);
      li.appendChild(deviceDesc); // should append this first
      li.appendChild(deviceName);

      return li;
    }

    // immediatly UI update, DOM element manipulation.
    function updateDeviceList(show) {
      bluetoothSearch.hidden = !show;
      if (show) {
        enableMsg.hidden = true;
        openList.show(true);
        searchingItem.hidden = false;
        document.addEventListener('visibilitychange',
            stopDiscoveryWhenLeaveApp);
      } else {
        openList.show(false);
        pairList.show(false);
        enableMsg.hidden = false;
        searchingItem.hidden = true;
        optionMenu.close();
        pairingAddress = null;
        connectingAddress = null;
        connectedAddress = null;
        // clear discoverTimeout
        clearTimeout(discoverTimeout);
        discoverTimeout = null;
        document.removeEventListener('visibilitychange',
            stopDiscoveryWhenLeaveApp);
      }
    }

    // do default actions (start discover avaliable devices)
    // when DefaultAdapter is ready.
    function initial() {
      // Bind message handler for incoming pairing requests
      window.removeEventListener('bluetooth-pairing-request', onRequestPairing);
      window.addEventListener('bluetooth-pairing-request', onRequestPairing);

      navigator.mozSetMessageHandler('bluetooth-cancel',
        function bt_gotCancelMessage(message) {
          showDevicePaired(false, null);
        }
      );

      defaultAdapter.onpairedstatuschanged = function bt_getPairedMessage(evt) {
        dispatchEvent(new CustomEvent('bluetooth-pairedstatuschanged'));
        showDevicePaired(evt.status, 'Authentication Failed');
      };

      defaultAdapter.onhfpstatuschanged = function bt_hfpStatusChanged(evt) {
        showDeviceConnected(evt.address, evt.status, Profiles.HFP);
      };

      defaultAdapter.ona2dpstatuschanged = function bt_a2dpStatusChanged(evt) {
        showDeviceConnected(evt.address, evt.status, Profiles.A2DP);
      };

      // Get paired device
      getPairedDevice(function() {
        for (var address in pairList.index) {
          var deviceItem = pairList.index[address];
          if (Object.keys(deviceItem.connectedProfiles).length > 0)
            return;
        }

        // If there is no current connection and we have one device connected
        // before, restore it.
        restoreConnection();
      });
      startDiscovery();
    }

    function restoreConnection() {
      // Reconnect the one kept in the async storage.
      window.asyncStorage.getItem('device.connected', function(value) {
        if (!value || !pairList.index[value])
          return;

        var device = pairList.index[value].device;
        setDeviceConnect(device);
      });
    }

    function getPairedDevice(callback) {
      if (!bluetooth.enabled || !defaultAdapter)
        return;
      var req = defaultAdapter.getPairedDevices();
      req.onsuccess = function bt_getPairedSuccess() {
        // copy for sorting
        var paired = req.result.slice();
        var length = paired.length;
        if (length == 0) {
          pairList.show(false);
          return;
        }
        pairList.clear();
        paired.sort(function(a, b) {
          return a.name > b.name;
        });
        for (var i = 0; i < length; i++) {
          (function(device) {
            var aItem = newListItem(device, '');
            aItem.onclick = function() {
              optionMenu.show(device);
            };
            pairList.list.appendChild(aItem);
            pairList.index[device.address] = {
              device: device,
              item: aItem,
              connectedProfiles: {}
            };
            // if the device has to be connected when it just paired
            // wait for a while so they can have time to communicate
            // their connection protocol
            if (device.address === connectingAddress &&
                device.icon === 'audio-card') {
              var small = aItem.querySelector('small');
              l10n.localize(small, 'device-status-connecting');
              setTimeout(function() {
                setDeviceConnect(device);
              }, 5000);
            }
          })(paired[i]);
        }

        // update the connection status
        getConnectedDeviceItems(function(connectedDeviceItems) {
          if (connectedDeviceItems.length > 0) {
            connectedDeviceItems.forEach(function(item) {
              var connectedDevice = item.device;
              var connectedProfiles = item.connectedProfiles;
              for (var profile in connectedProfiles) {
                showDeviceConnected(connectedDevice.address, true, profile);
              }
            });
          }

          pairList.show(true);
          // the callback function now is for restoring the connected device
          // when the bluetooth is turned on.
          if (callback)
            callback();
        });
      };
    }

    // In the callback we returns an array of connected device items.
    // Each device item contains "device" and "connectedProfiles".
    function getConnectedDeviceItems(callback) {
      if (!callback)
        return;

      if (!defaultAdapter) {
        callback([]);
        return;
      }

      var getConnectedDevicesByProfile = function(profileID, gcdCallback) {
        if (!gcdCallback)
          return;

        var req = defaultAdapter.getConnectedDevices(profileID);
        req.onsuccess = function() {
          gcdCallback(req.result || []);
        };
        req.onerror = function() {
          gcdCallback(null);
        };
      };

      var connectedDeviceItemsMap = {}; // hash by device address
      var updateDeviceItemsMap = function(profileID, connectedDevices) {
        if (!connectedDevices)
          return;

        connectedDevices.forEach(function(connectedDevice) {
          var info = connectedDeviceItemsMap[connectedDevice.address];
          if (info) {
            info.connectedProfiles[profileID] = true;
          } else {
            info = {
              'device': connectedDevice,
              'connectedProfiles': {}
            };
            info.connectedProfiles[profileID] = true;
          }
          connectedDeviceItemsMap[connectedDevice.address] = info;
        });
      };

      // XXX: we should have better ways of doing this.
      getConnectedDevicesByProfile(Profiles.HFP, function(hfpResult) {
        updateDeviceItemsMap(Profiles.HFP, hfpResult);
        getConnectedDevicesByProfile(Profiles.A2DP, function(a2dpResult) {
          updateDeviceItemsMap(Profiles.A2DP, a2dpResult);

          var connectedDeviceItems = [];
          for (var i in connectedDeviceItemsMap) {
            var item = connectedDeviceItemsMap[i];
            connectedDeviceItems.push(item);
          }
          callback(connectedDeviceItems);
        });
      });
    }

    // callback function when an avaliable device found
    function onDeviceFound(evt) {
      var device = evt.device;
      // Ignore duplicate and paired device. Update the name if needed.
      var existingDevice = openList.index[device.address] ||
        pairList.index[device.address];
      if (existingDevice) {
        var existingItem = existingDevice.item;
        if (device.name && existingItem) {
          var deviceName = existingItem.querySelector('a');
          if (deviceName) {
            deviceName.dataset.l10nId = '';
            deviceName.textContent = device.name;
          }
        }
        return;
      }

      var aItem = newListItem(device, 'device-status-tap-connect');

      // bind paired callback
      aItem.onclick = function() {
        // block the pairing request if there is already one.
        if (pairingAddress)
          return;

        var small = aItem.querySelector('small');
        l10n.localize(small, 'device-status-pairing');
        this.setAttribute('aria-disabled', true);
        stopDiscovery();

        var req = defaultAdapter.pair(device.address);
        pairingMode = 'active';
        pairingAddress = device.address;
        req.onerror = function bt_pairError(error) {
          showDevicePaired(false, req.error.name);
        };
      };

      openList.list.appendChild(aItem);
      openList.index[device.address] = {
        device: device,
        item: aItem,
        connectedProfiles: {}
      };
    }

    function showDevicePaired(paired, errorMessage) {
      // If we don't know the pairing device address,
      // it means the pair request is handled by interface level.
      // So we just need to update paired list.
      if (!pairingAddress) {
        getPairedDevice();
        return;
      }
      // clear pairingAddress first to prevent execute
      // the same status update twice.
      var workingAddress = pairingAddress;
      pairingAddress = null;
      if (paired) {
        // if the device is on the list, remove it.
        // it will show on paired list later.
        if (openList.index[workingAddress]) {
          var device = openList.index[workingAddress].device;
          var item = openList.index[workingAddress].item;
          openList.list.removeChild(item);
          delete openList.index[workingAddress];
          connectingAddress = workingAddress;
        }
      } else {
        // if the attention screen still open, close it
        if (childWindow) {
          childWindow.PairView.closeInput();
          childWindow.close();
        }
        // display failure only when active request
        if (pairingMode === 'active' && !userCanceledPairing) {
          // show pair process fail.
          var msg = _('error-pair-title');
          if (errorMessage === 'Repeated Attempts') {
            msg = msg + '\n' + _('error-pair-toofast');
          } else if (errorMessage === 'Authentication Failed') {
            msg = msg + '\n' + _('error-pair-pincode');
          }
          window.alert(msg);
        }
        userCanceledPairing = false;
        // rollback device status
        if (openList.index[workingAddress]) {
          var item = openList.index[workingAddress].item;
          var small = item.querySelector('small');
          item.removeAttribute('aria-disabled');
          l10n.localize(small, 'device-status-tap-connect');
        }
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
      var req = defaultAdapter.unpair(device.address);
      req.onerror = function bt_pairError() {
        showDevicePaired(true, null);
      };
    }

    function setDeviceDisconnect(device, callback) {
      if (!bluetooth.enabled || !defaultAdapter ||
          device.address !== connectedAddress) {
        if (callback)
          callback();
        return;
      }

      var req = defaultAdapter.disconnect(device);
      req.onsuccess = req.onerror = function() {
        if (callback)
          callback();
      };
    }

    function setDeviceConnect(device) {
      // we only support audio-card device to connect now
      if (!bluetooth.enabled || !defaultAdapter ||
          device.icon !== 'audio-card' ||
          device.address === connectedAddress) {
        connectingAddress = null;
        return;
      }

      var doConnect = function() {
        var connectSuccess = function bt_connectSuccess() {
          if (connectingAddress) {
            connectingAddress = null;
          }
        };

        var connectError = function bt_connectError() {
          // Connection state might be changed before DOM request response.
          if (connectingAddress) {
            // Clear the text of connecting status.
            var small =
              pairList.index[connectingAddress].item.querySelector('small');
            small.textContent = '';
            small.dataset.l10nId = '';
            connectingAddress = null;
            window.alert(_('error-connect-msg'));
          }
        };

        stopDiscovery();

        var req = defaultAdapter.connect(device);
        req.onsuccess = connectSuccess; // At least one profile is connected.
        req.onerror = connectError; // No available profiles are connected.

        connectingAddress = device.address;
        if (!pairList.index[connectingAddress]) {
          return;
        }

        var small =
          pairList.index[connectingAddress].item.querySelector('small');
        l10n.localize(small, 'device-status-connecting');
      };

      // disconnect current connected device first
      if (connectedAddress && pairList.index[connectedAddress]) {
        setDeviceDisconnect(pairList.index[connectedAddress].device, doConnect);
      } else {
        doConnect();
      }
    }

    function showDeviceConnected(deviceAddress, connected, profile) {
      var deviceItem = pairList.index[deviceAddress];
      if (!deviceItem)
        return;

      deviceItem.connectedProfiles[profile] = connected;

      var existConnectedProfile = false;
      if (connected) {
        existConnectedProfile = true;
      } else {
        // Check if there are other connected profiles
        for (var profile in deviceItem.connectedProfiles) {
          existConnectedProfile = existConnectedProfile ||
                                  deviceItem.connectedProfiles[profile];
        }
      }

      if (existConnectedProfile) {
        connectedAddress = deviceAddress;
        // record connected device so if Bluetooth is turned off and then on
        // we can restore the connection
        window.asyncStorage.setItem('device.connected', connectedAddress);
      } else {
        if (connectedAddress === deviceAddress) {
          connectedAddress = null;
          window.asyncStorage.removeItem('device.connected');
        }
      }

      var l10nId = '';
      var hfpConnected = deviceItem.connectedProfiles[Profiles.HFP];
      var a2dpConnected = deviceItem.connectedProfiles[Profiles.A2DP];
      if (hfpConnected && a2dpConnected) {
        l10nId = 'device-status-connected-phone-media';
      } else if (hfpConnected) {
        l10nId = 'device-status-connected-phone';
      } else if (a2dpConnected) {
        l10nId = 'device-status-connected-media';
      } else {
        l10nId = null;
      }

      var small = pairList.index[deviceAddress].item.querySelector('small');
      if (l10nId) {
        l10n.localize(small, l10nId);
      } else {
        small.textContent = '';
        small.dataset.l10nId = '';
      }
    }

    function onRequestPairing(evt) {
      var evt = evt.detail;
      var showPairView = function bt_showPairView() {
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
        var method = evt.method;
        var protocol = window.location.protocol;
        var host = window.location.host;
        childWindow = window.open(protocol + '//' + host + '/onpair.html',
                    'pair_screen', 'attention');
        childWindow.onload = function childWindowLoaded() {
          childWindow.PairView.init(pairingMode, method, device, passkey);
        };
      };

      var req = navigator.mozSettings.createLock().get('lockscreen.locked');
      req.onsuccess = function bt_onGetLocksuccess() {
        if (!req.result['lockscreen.locked']) {
          showPairView();
        }
      };
      req.onerror = function bt_onGetLockError() {
        // fallback to default value 'unlocked'
        showPairView();
      };
    }

    function startDiscovery() {
      if (!bluetooth.enabled || !defaultAdapter || discoverTimeout)
        return;

      var req = defaultAdapter.startDiscovery();
      req.onsuccess = function bt_discoveryStart() {
        searchAgainBtn.disabled = true;
        if (!discoverTimeout)
          discoverTimeout = setTimeout(stopDiscovery, discoverTimeoutTime);
      };
      req.onerror = function bt_discoveryFailed() {
        searchingItem.hidden = true;
        searchAgainBtn.disabled = false;
      };
    }

    function stopDiscoveryWhenLeaveApp() {
      //only stop discovery when Settings app is hidden
      if (!document.hidden)
        return;
      stopDiscovery();
    }

    function stopDiscovery() {
      if (!bluetooth.enabled || !defaultAdapter || !discoverTimeout)
        return;
      var req = defaultAdapter.stopDiscovery();
      req.onsuccess = function bt_discoveryStopped() {
        searchAgainBtn.disabled = false;
        searchingItem.hidden = true;
      };
      req.onerror = function bt_discoveryStopFailed() {
        console.error('Can not stop discover nearby device');
        searchAgainBtn.disabled = true;
        searchingItem.hidden = false;
      };
      clearTimeout(discoverTimeout);
      discoverTimeout = null;
    }

    function setConfirmation(address, confirmed) {
      if (!bluetooth.enabled || !defaultAdapter)
        return;
      userCanceledPairing = !confirmed;
      var req = defaultAdapter.setPairingConfirmation(address, confirmed);
    }

    function setPinCode(address, pincode) {
      if (!bluetooth.enabled || !defaultAdapter)
        return;
      defaultAdapter.setPinCode(address, pincode);
    }

    function setPasskey(address, passkey) {
      if (!bluetooth.enabled || !defaultAdapter)
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

    // lock UI toggle
    gBluetoothCheckBox.disabled = true;

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

  bluetooth.addEventListener('adapteradded', function() {
    // enable UI toggle
    gBluetoothCheckBox.disabled = false;
    initialDefaultAdapter();
    dispatchEvent(new CustomEvent('bluetooth-adapter-added'));
  });
  bluetooth.addEventListener('disabled', function() {
    gBluetoothCheckBox.disabled = false;  // enable UI toggle
    defaultAdapter = null;  // clear defaultAdapter
    dispatchEvent(new CustomEvent('bluetooth-disabled'));
  });
});
