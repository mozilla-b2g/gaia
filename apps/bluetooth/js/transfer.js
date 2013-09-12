/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

window.addEventListener('localized', function showPanel() {
  var settings = window.navigator.mozSettings;
  var bluetooth = window.navigator.mozBluetooth;
  var defaultAdapter = null;
  var activity = null;
  var pairList = {
    index: []
  };

  navigator.mozSetMessageHandler('activity', function handler(activityRequest) {
    activity = activityRequest;
    if (settings && bluetooth &&
        (activity.source.name == 'share') &&
        (activity.source.data.blobs &&
         activity.source.data.blobs.length > 0)) {
      isBluetoothEnabled();
    } else {
      var msg = 'Cannot transfer without blobs data!';
      cannotTransfer(msg);
    }
  });

  var dialogConfirmBluetooth =
    document.getElementById('enable-bluetooth-view');
  var bluetoothCancelButton =
    document.getElementById('enable-bluetooth-button-cancel');
  var bluetoothTurnOnButton =
    document.getElementById('enable-bluetooth-button-turn-on');
  var dialogAlertView = document.getElementById('alert-view');
  var alertOkButton = document.getElementById('alert-button-ok');
  var dialogConfirmPairing =
    document.getElementById('enable-bluetooth-settings-view');
  var pairingCancelButton =
    document.getElementById('enable-bluetooth-settings-button-cancel');
  var pairingOkButton =
    document.getElementById('enable-bluetooth-settings-button-ok');
  var deviceSelect = null;
  var dialogDeviceSelector = document.getElementById('value-selector');
  var deviceSelectorContainers =
    document.getElementById('value-selector-container');
  var optionsContainer =
    document.querySelector('#value-selector-container ol');
  var deviceCancelButton =
    document.getElementById('device-select-button-cancel');
  var deviceOkButton = document.getElementById('device-select-button-ok');
  // Don't let this form accidentally get submitted
  document.getElementById('select-option-popup').onsubmit =
    function handleSubmit(e) { e.preventDefault(); };

  var _debug = false;

  function debug(msg) {
    if (!_debug)
      return;

    console.log('[Bluetooth APP Send File]: ' + msg);
  }

  function isBluetoothEnabled() {
    // get bluetooth status
    var req = settings.createLock().get('bluetooth.enabled');
    req.onsuccess = function bt_EnabledSuccess() {
      if (req.result['bluetooth.enabled']) {
        initialDefaultAdapter(getPairedDevice);
      } else {
        confirmTurnBluetoothOn();
      }
    };
    req.onerror = function bt_EnabledOnerror() {
      var msg = 'Can not get bluetooth.enabled from setting!';
      cannotTransfer(msg);
    };
  }

  function confirmTurnBluetoothOn() {
    dialogConfirmBluetooth.hidden = false;
    bluetoothCancelButton.addEventListener('click', cancelTransfer);
    bluetoothTurnOnButton.addEventListener('click', turnOnBluetooth);
  }

  function turnOnBluetooth(evt) {
    if (evt)
      evt.preventDefault();

    dialogConfirmBluetooth.hidden = true;
    bluetooth.onadapteradded = function bt_adapterAdded() {
      initialDefaultAdapter(getPairedDevice);
    };
    settings.createLock().set({'bluetooth.enabled': true});
  }

  function initialDefaultAdapter(callback) {
    if (!bluetooth.enabled) {
      return;
    }

    var req = bluetooth.getDefaultAdapter();
    req.onsuccess = function bt_getAdapterSuccess() {
      defaultAdapter = req.result;
      if (defaultAdapter == null) {
        // we can do nothing without DefaultAdapter, so set bluetooth disabled
        settings.createLock().set({'bluetooth.enabled': false});
        var msg = 'Get null bluetooth adapter!';
        cannotTransfer(msg);
        return;
      }
      if (callback) {
        callback();
      }
    };
    req.onerror = function bt_getAdapterFailed() {
      // we can do nothing without DefaultAdapter, so set bluetooth disabled
      settings.createLock().set({'bluetooth.enabled': false});
      var msg = 'Can not get bluetooth adapter!';
      cannotTransfer(msg);
    };
  }

  function cancelTransfer(evt) {
    if (evt)
      evt.preventDefault();

    dialogConfirmBluetooth.hidden = true;
    dialogDeviceSelector.hidden = true;
    activity.postError('cancelled');
    endTransfer();
  }

  function cannotTransfer(msg) {
    debug(msg);
    dialogAlertView.hidden = false;
    alertOkButton.addEventListener('click', closeAlert);
  }

  function closeAlert() {
    dialogAlertView.hidden = true;
    alertOkButton.removeEventListener('click', closeAlert);
    activity.postError('cancelled');
    endTransfer();
  }

  function showPairingConfirmation(msg) {
    debug(msg);
    dialogConfirmPairing.hidden = false;
    pairingCancelButton.addEventListener('click',
      confirmPairingDevice.bind(this, false));
    pairingOkButton.addEventListener('click',
      confirmPairingDevice.bind(this, true));
  }

  function confirmPairingDevice(enabled) {
    dialogConfirmPairing.hidden = true;
    pairingCancelButton.removeEventListener('click', confirmPairingDevice);
    pairingOkButton.removeEventListener('click', confirmPairingDevice);
    if (enabled) {
      // Launch Settings App to Bluetooth settings.
      var activityRequest = new MozActivity({
        name: 'configure',
        data: {
          target: 'device',
          section: 'bluetooth'
        }
      });
    }
    activity.postError('cancelled');
    endTransfer();
  }

  function endTransfer() {
    bluetoothCancelButton.removeEventListener('click', cancelTransfer);
    bluetoothTurnOnButton.removeEventListener('click', turnOnBluetooth);
    activity = null;
  }

  function getPairedDevice() {
    var req = defaultAdapter.getPairedDevices();
    req.onsuccess = function bt_getPairedSuccess() {
      pairList.index = req.result;
      var length = pairList.index.length;
      if (length == 0) {
        var msg = 'There is no paired device!' +
                  ' Please pair your bluetooth device first.';
        showPairingConfirmation(msg);
        return;
      }
      // Put the list to value selector
      deviceSelect = document.createElement('select');
      for (var i = 0; i < length; i++) {
        (function(device) {
          deviceSelect.options[i] = new Option(device.name, i);
        })(pairList.index[i]);
      }
      deviceSelect.selectedIndex = 0;
      buildOptions(deviceSelect.options);
      showHidePairDeviceSelector(true);
    };
    req.onerror = function() {
      var msg = 'Can not get paired devices from adapter.';
      cannotTransfer(msg);
    };
  }

  function buildOptions(options) {
    var optionHTML = '';
    function escapeHTML(str) {
      var span = document.createElement('span');
      span.textContent = str;
      return span.innerHTML;
    }

    for (var i = 0, n = options.length; i < n; i++) {
      var checked = options[i].selected ? ' aria-checked="true"' : '';
      options[i].optionIndex = i;
      optionHTML += '<li data-option-index="' + options[i].optionIndex + '"' +
                     checked + '>' +
                     '<label> <span>' +
                     escapeHTML(options[i].text) +
                     '</span></label>' +
                    '</li>';
    }
    optionsContainer.innerHTML = optionHTML;
    // Apply different style when the options are more than 1 page
    if (options.length > 5) {
      deviceSelectorContainers.classList.add('scrollable');
    } else {
      deviceSelectorContainers.classList.remove('scrollable');
    }
  }

  function showHidePairDeviceSelector(enabled) {
    if (enabled) {
      dialogDeviceSelector.hidden = false;
      deviceSelectorContainers.addEventListener('click', handleSelect);
      deviceCancelButton.addEventListener('click', cancelTransfer);
      deviceOkButton.addEventListener('click', transferToDevice);
    } else {
      dialogDeviceSelector.hidden = true;
      deviceSelectorContainers.removeEventListener('click', handleSelect);
      deviceCancelButton.removeEventListener('click', cancelTransfer);
      deviceOkButton.removeEventListener('click', transferToDevice);
    }
  }

  function handleSelect(evt) {
    if (evt.target.dataset === undefined ||
        (evt.target.dataset.optionIndex === undefined &&
         evt.target.dataset.optionValue === undefined))
      return;

    var selectee =
      deviceSelectorContainers.querySelectorAll('[aria-checked="true"]');
    for (var i = 0; i < selectee.length; i++) {
      selectee[i].removeAttribute('aria-checked');
    }
    evt.target.setAttribute('aria-checked', 'true');
  }

  function transferToDevice(evt) {
    var selectee =
      deviceSelectorContainers.querySelectorAll('[aria-checked="true"]');
    deviceSelect.selectedIndex = selectee[0].dataset.optionIndex;
    var selectedIndex = deviceSelect.options[deviceSelect.selectedIndex].value;
    var targetDevice = pairList.index[selectedIndex];
    // '0x1105' is a service id to distigush connection type.
    // https://www.bluetooth.org/Technical/AssignedNumbers/service_discovery.htm
    var transferRequest = defaultAdapter.connect(targetDevice, 0x1105);
    transferRequest.onsuccess = function bt_connSuccess() {
      var blobs = activity.source.data.blobs;
      blobs.forEach(function(blob) {
        defaultAdapter.sendFile(targetDevice.address, blob);
      });

      activity.postResult('transferred');
      endTransfer();
    };

    transferRequest.onerror = function bt_connError() {
      var msg = 'Can not get adapter connect!';
      cannotTransfer(msg);
    };
    showHidePairDeviceSelector(false);
  }
});
