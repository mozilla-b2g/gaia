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
  var _ = navigator.mozL10n.get;
  var settings = Settings.mozSettings;
  var bluetooth = getBluetooth();
  var defaultAdapter = null;

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

      var nameEntered = window.prompt(_('change-phone-name'), myName);

      // Bug 847459: Default name of the bluetooth device is set by bluetoothd
      // to the value of the Android ro.product.model property upon first
      // start. In case the user gives an empty bluetooth device name, we want
      // to revert to the original ro.product.model. Gecko exposes it under
      // the deviceinfo.product_model setting.
      var deviceInfo = settings.createLock().get('deviceinfo.product_model');
      deviceInfo.onsuccess = function bt_getProductModel() {
        var productModel = deviceInfo.result['deviceinfo.product_model'];

        nameEntered = nameEntered.replace(/^\s+|\s+$/g, '');

        if (nameEntered === myName || !bluetooth.enabled || !defaultAdapter) {
          return;
        }

        var req = defaultAdapter.setName(nameEntered || productModel);
        req.onsuccess = function bt_renameSuccess() {
          myName = visibleName.textContent = defaultAdapter.name;
        };
      };
    };

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
            stopDiscovery();
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
      var aName = (device.name === '') ? _('unnamed-device') : device.name;
      var aL10nId = (device.name === '') ? 'unnamed-device' : '';
      deviceName.textContent = aName;
      deviceName.dataset.l10nId = aL10nId;

      var deviceDesc = document.createElement('small');
      deviceDesc.textContent = (descL10nId === '') ? '' : _(descL10nId);
      deviceDesc.dataset.l10nId = descL10nId;

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

      navigator.mozSetMessageHandler('bluetooth-pairedstatuschanged',
        function bt_getPairedMessage(message) {
          dispatchEvent(new CustomEvent('bluetooth-pairedstatuschanged'));
          showDevicePaired(message.paired, 'Authentication Failed');
        }
      );

      defaultAdapter.onhfpstatuschanged = function bt_getConnectedMessage(evt) {
        showDeviceConnected(evt.address, evt.status);
      };

      // get paired device and restore connection
      // if we have one device connected before.
      getPairedDevice(restoreConnection);
      startDiscovery();
    }

    function restoreConnection() {
      window.asyncStorage.getItem('device.connected', function(value) {
        if (!value || !pairList.index[value])
          return;
        var device = pairList.index[value][0];
        isDeviceConnected(device, function(connected) {
          if (connected) {
            showDeviceConnected(device.address, true);
          } else {
            setDeviceConnect(device);
          }
        });
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
            var stateL10nId = (device.address === connectedAddress) ?
              'device-status-connected' : '';
            var aItem = newListItem(device, stateL10nId);
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
              var small = aItem.querySelector('small');
              small.textContent = _('device-status-connecting');
              small.dataset.l10nId = 'device-status-connecting';
              setTimeout(function() {
                setDeviceConnect(device);
              }, 5000);
            }
          })(paired[i]);
        }
        pairList.show(true);
        // the callback function now is for restoring the connected device
        // when the bluetooth is turned on.
        if (callback)
          callback();
      };
    }

    function isDeviceConnected(device, callback) {
      if (!callback)
        return;

      if (defaultAdapter && device) {
        var getConnectedDevices = function(profileID, gcdCallback) {
          var req = defaultAdapter.getConnectedDevices(profileID);
          req.onsuccess = function() {
            if (gcdCallback) {
              gcdCallback(req.result || []);
            }
          };
          req.onerror = function() {
            if (gcdCallback) {
              gcdCallback(null);
            }
          };
        };

        var findDeviceByAddress = function(address, connectedDevices) {
          if (!connectedDevices)
            return false;

          var found = false;
          for (var i in connectedDevices) {
            var connectedDevice = connectedDevices[i];
            if (connectedDevice.address === address) {
              found = true;
              break;
            }
          }
          return found;
        };

        // '0x111E' is a service id of HFP.
        // '0x1108' is a service id of HSP.
        getConnectedDevices(0x111E, function(hfpResult) {
          if (findDeviceByAddress(device.address, hfpResult)) {
            callback(true);
          } else {
            getConnectedDevices(0x1108, function(hspResult) {
              if (findDeviceByAddress(device.address, hspResult)) {
                callback(true);
              } else {
                callback(false);
              }
            });
          }
        });
      } else {
        callback(false);
      }
    }

    // callback function when an avaliable device found
    function onDeviceFound(evt) {
      var device = evt.device;
      // Ignore duplicate and paired device. Update the name if needed.
      var existingDevice = openList.index[device.address] ||
        pairList.index[device.address];
      if (existingDevice) {
        var existingItem = existingDevice[1];
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
        var small = aItem.querySelector('small');
        small.textContent = _('device-status-pairing');
        small.dataset.l10nId = 'device-status-pairing';
        stopDiscovery();

        var req = defaultAdapter.pair(device);
        pairingMode = 'active';
        pairingAddress = device.address;
        req.onerror = function bt_pairError(error) {
          showDevicePaired(false, req.error.name);
        };

      };
      openList.list.appendChild(aItem);
      openList.index[device.address] = [device, aItem];
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
          var device = openList.index[workingAddress][0];
          var item = openList.index[workingAddress][1];
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
          var small = openList.index[workingAddress][1].querySelector('small');
          small.textContent = _('device-status-tap-connect');
          small.dataset.l10nId = 'device-status-tap-connect';
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
      var req = defaultAdapter.unpair(device);
      req.onerror = function bt_pairError() {
        showDevicePaired(true, null);
      };
    }

    function setDeviceDisconnect(device) {
      if (!bluetooth.enabled || !defaultAdapter ||
          device.address !== connectedAddress)
        return;

      // '0x111E' is a service id of HFP.
      // https://www.bluetooth.org/Technical/AssignedNumbers/service_discovery.htm
      // XXX: Bug 870689. The device maybe connected using HFP or HSP. Always
      // pass 0x111E here until gecko separates these two profiles.
      var req = defaultAdapter.disconnect(0x111E);
      req.onerror = function() {
        showDeviceConnected(device.address, true);
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

      // disconnect current connected device first
      if (connectedAddress && pairList.index[connectedAddress]) {
        setDeviceDisconnect(pairList.index[connectedAddress][0]);
      }

      var connectToDevice =
        function bt_connectToDevice(address, serviceID, onsuccess, onerror) {
          var req = defaultAdapter.connect(address, serviceID);
          req.onerror = onerror;
          req.onsuccess = onsuccess;
          return req;
        };

      var connectError = function bt_connectError() {
        // Connection state might be changed before DOM request response.
        if (connectingAddress) {
          showDeviceConnected(connectingAddress, false);
          connectingAddress = null;
          window.alert(_('error-connect-msg'));
        }
      };

      // '0x111E' is a service id of HFP.
      // '0x1108' is a service id of HSP.
      // https://www.bluetooth.org/Technical/AssignedNumbers/service_discovery.htm
      var req = connectToDevice(device.address, 0x111E, null, function() {
        if (req.error.name === 'DeviceChannelRetrievalError') {
          // Try to connect using HSP again.
          connectToDevice(device.address, 0x1108, null, function() {
            connectError();
          });
        } else {
          connectError();
        }
      });

      connectingAddress = device.address;
      if (!pairList.index[connectingAddress]) {
        return;
      }
      var small = pairList.index[connectingAddress][1].querySelector('small');
      small.textContent = _('device-status-connecting');
      small.dataset.l10nId = 'device-status-connecting';
    }

    function showDeviceConnected(deviceAddress, connected) {
      if (connected) {
        connectedAddress = deviceAddress;
        // clear it because we are not in a connecting status now.
        connectingAddress = null;
        // record connected device so if Bluetooth is turned off and then on
        // we can restore the connection
        window.asyncStorage.setItem('device.connected', connectedAddress);
      } else {
        if (connectedAddress === deviceAddress) {
          connectedAddress = null;
          window.asyncStorage.removeItem('device.connected');
        }
      }
      if (!pairList.index[deviceAddress]) {
        return;
      }
      var small = pairList.index[deviceAddress][1].querySelector('small');
      small.textContent = (connected) ? _('device-status-connected') : '';
      small.dataset.l10nId = (connected) ? 'device-status-connected' : '';
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

