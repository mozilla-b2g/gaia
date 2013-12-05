/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

window.addEventListener('localized', function showPanel() {
  var _ = navigator.mozL10n.get;
  var settings = window.navigator.mozSettings;
  var bluetooth = window.navigator.mozBluetooth;
  var defaultAdapter = null;
  var activity = null;
  var sendingFilesSchedule = {};
  var _debug = false;

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
        initialDefaultAdapter();
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
      initialDefaultAdapter();
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
      defaultAdapter.ondevicefound = gDeviceList.onDeviceFound;

      // initial related components that need defaultAdapter.
      // Set callback function for selected device, exit devices list view
      gDeviceList.initWithAdapter(defaultAdapter,
                                  transferToDevice, cancelTransfer);
      gDeviceList.update(true);
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
    gDeviceList.uninit();
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

  function endTransfer() {
    bluetoothCancelButton.removeEventListener('click', cancelTransfer);
    bluetoothTurnOnButton.removeEventListener('click', turnOnBluetooth);
    activity = null;
  }

  function transferToDevice(device) {
    var targetDevice = device;

    // Post message to system app for sending files in queue
    // Producer: Bluetooth app produce one message for each sending file request
    sendingFilesSchedule = {
      numberOfFiles: activity.source.data.filenames.length,
      numSuccessful: 0,
      numUnsuccessful: 0
    };
    postMessageToSystemApp(sendingFilesSchedule);

    // Send each file via Bluetooth sendFile API
    var blobs = activity.source.data.blobs;
    blobs.forEach(function(blob) {
      defaultAdapter.sendFile(targetDevice.address, blob);
      var msg = 'file is sending...';
      debug(msg);
    });

    activity.postResult('transferred');
    endTransfer();
  }

  // Inner app communcation:
  function postMessageToSystemApp(sendingFilesSchedule) {
    // Set up Inter-App Communications
    navigator.mozApps.getSelf().onsuccess = function gotSelf(evt) {
      var app = evt.target.result;
      // If IAC doesn't exist, just bail out.
      if (!app.connect) {
        sendingFilesSchedule = {};
        return;
      }

      app.connect('bluetoothTransfercomms').then(function(ports) {
        ports.forEach(function(port) {
          port.postMessage(sendingFilesSchedule);
          var msg = 'post message to system app...';
          debug(msg);
        });
        sendingFilesSchedule = {};
      });
    };
  }
});
