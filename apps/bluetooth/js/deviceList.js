/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var gDeviceList = null;

// handle Bluetooth settings
navigator.mozL10n.ready(function deviceList() {
  var _ = navigator.mozL10n.get;
  var settings = window.navigator.mozSettings;
  var bluetooth = window.navigator.mozBluetooth;
  var defaultAdapter = null;
  var _debug = false;

  if (!settings || !bluetooth) {
    return;
  }

  function debug(msg) {
    if (!_debug)
      return;

    console.log('[Bluetooth APP Device List]: ' + msg);
  }

  // device list
  gDeviceList = (function deviceList() {
    var deviceList = document.getElementById('devices-list-view');
    var bluetoothSearch = document.getElementById('bluetooth-search');
    var searchAgainBtn = document.getElementById('search-device');
    var searchingItem = document.getElementById('bluetooth-searching');
    var exitButton = document.getElementById('cancel-activity');

    var pairingMode = 'active';
    var userCanceledPairing = false;
    var pairingAddress = null;
    var connectingAddress = null;
    var connectedAddress = null;
    // stop discover other device after 60 seconds
    var discoverTimeoutTime = 60000;
    var discoverTimeout = null;
    // Register handler from share activity
    var onDeviceSelectedHandler = null;
    var onExitBtnClickedHandler = null;
    var isSendingFile = false;

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

    searchAgainBtn.onclick = function searchAgainClicked() {
      if (isSendingFile || pairingAddress) {
        return;
      }

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

      var pairingProgress = document.createElement('progress');
      pairingProgress.classList.add('overlapping-icon');
      pairingProgress.classList.add('hidden');

      var li = document.createElement('li');
      li.classList.add('bluetooth-device');
      li.classList.add('bluetooth-type-' + device.icon);
      li.appendChild(deviceDesc); // should append this first
      li.appendChild(deviceName);
      li.appendChild(pairingProgress);

      return li;
    }

    // immediatly UI update, DOM element manipulation.
    function updateDeviceList(show) {
      bluetoothSearch.hidden = !show;
      if (show) {
        openList.show(true);
        searchingItem.hidden = false;
      }
    }

    // do default actions (start discover avaliable devices)
    // when DefaultAdapter is ready.
    function initial(adapter, deviceSelectedCallback, exitBtnClickedCallback) {
      deviceList.hidden = false;
      exitButton.addEventListener('click', cancelActivity);
      defaultAdapter = adapter;
      defaultAdapter.onpairedstatuschanged = function bt_getPairedMessage(evt) {
        showDevicePaired(evt.status, 'Authentication Failed');
      };

      onDeviceSelectedHandler = deviceSelectedCallback;
      onExitBtnClickedHandler = exitBtnClickedCallback;

      // get paired device and restore connection
      // if we have one device connected before.
      getPairedDevice();
      startDiscovery();
    }

    function uninit() {
      deviceList.hidden = true;
      defaultAdapter = null;
      exitButton.removeEventListener('click', cancelActivity);
    }

    function getPairedDevice() {
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
              if (isSendingFile || pairingAddress) {
                return;
              }

              stopDiscovery();

              // show the description to be Connecting...
              // since we do connection and send file to the device
              var small = aItem.querySelector('small');
              small.textContent = _('device-status-connecting');
              small.dataset.l10nId = 'device-status-connecting';
              readyToSendFile(device);
            };
            pairList.list.appendChild(aItem);
            pairList.index[device.address] = [device, aItem];
          })(paired[i]);
        }
        pairList.show(true);
      };
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
        stopDiscovery();
        if (isSendingFile || pairingAddress) {
          return;
        }
        var small = aItem.querySelector('small');
        small.textContent = _('device-status-pairing');
        small.dataset.l10nId = 'device-status-pairing';
        // hide the device icon
        aItem.classList.add('icon-hidden');
        // show the pairing progress
        var progress = aItem.querySelector('progress');
        progress.classList.remove('hidden');

        var req = defaultAdapter.pair(device.address);
        pairingMode = 'active';
        pairingAddress = device.address;
        var msg = 'pairing with address = ' + pairingAddress;
        debug(msg);
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
      // turn on search button while pairing process finished
      searchAgainBtn.disabled = false;
      if (paired) {
        // if the device is on the list, remove it.
        // it will show on paired list later.
        if (openList.index[workingAddress]) {
          var device = openList.index[workingAddress][0];
          var item = openList.index[workingAddress][1];
          openList.list.removeChild(item);
          delete openList.index[workingAddress];
          connectingAddress = workingAddress;
          // Already paired with target device. Then, it's able to send files.
          readyToSendFile(device);
        }
      } else {
        // display failure only when active request
        if (pairingMode === 'active' && !userCanceledPairing) {
          // show pair process fail.
          var msg = _('error-pair-title');
          if (errorMessage === 'Repeated Attempts') {
            msg = msg + '\n' + _('error-pair-toofast');
          } else if (errorMessage === 'Authentication Failed') {
            msg = msg + '\n' + _('error-pair-pincode');
          }
          debug(msg);
          window.alert(msg);
        }
        userCanceledPairing = false;
        // rollback device status
        if (openList.index[workingAddress]) {
          var small = openList.index[workingAddress][1].querySelector('small');
          small.textContent = _('device-status-tap-connect');
          small.dataset.l10nId = 'device-status-tap-connect';
          // show the device icon
          var li = openList.index[workingAddress][1];
          li.classList.remove('icon-hidden');
          // hide the pairing progress
          var progress =
            openList.index[workingAddress][1].querySelector('progress');
          progress.classList.add('hidden');
        }
      }
      // acquire a new paired list no matter paired or unpaired
      getPairedDevice();
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
      //only stop discovery when Bluetooth app is hidden
      if (!document.hidden)
        return;
      stopDiscovery();
    }

    function stopDiscovery() {
      if (!bluetooth.enabled || !defaultAdapter || !discoverTimeout)
        return;

      var req = defaultAdapter.stopDiscovery();
      req.onsuccess = function bt_discoveryStopped() {
        if (!pairingAddress)
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

    function readyToSendFile(targetDevice) {
      isSendingFile = true;
      if (onDeviceSelectedHandler) {
        onDeviceSelectedHandler(targetDevice);
      }
    }

    function cancelActivity() {
      if (onExitBtnClickedHandler) {
        onExitBtnClickedHandler();
      }
    }

    // API
    return {
      update: updateDeviceList,
      initWithAdapter: initial,
      uninit: uninit,
      startDiscovery: startDiscovery,
      onDeviceFound: onDeviceFound
    };
  })();
});
