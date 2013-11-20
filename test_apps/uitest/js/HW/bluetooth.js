'use strict';

function bluetoothTest() {
  var bluetooth = window.navigator.mozBluetooth;
  var settings = window.navigator.mozSettings;
  var switchButton = document.getElementById('switch');

  function update() {
    var reqEnabled = settings.createLock().get('bluetooth.enabled');
    reqEnabled.onsuccess = function() {
      var isBluetoothEnabled = reqEnabled.result['bluetooth.enabled'];
      switchButton.checked = isBluetoothEnabled;

      if (!isBluetoothEnabled) {
        document.getElementById('state').innerHTML = 'Off';
        document.getElementById('address').innerHTML = 'unknown';
      }
      else {
        document.getElementById('state').innerHTML = 'On';

        var req = bluetooth.getDefaultAdapter();
        req.onsuccess = function bt_getAdapterSuccess() {
          if (switchButton.checked) {
            document.getElementById('address').innerHTML = req.result.address;
          }
        };
      }
    };
  }

  // Click on switch will only update settings and
  // it takes some time for bluetooth hardware to turns on.
  // That's why we should listen to 'enabled' event of bluetooth
  function bluetoothSwitch() {
    settings.createLock().set({'bluetooth.enabled': switchButton.checked});
  }

  bluetooth.addEventListener('adapteradded', update);
  bluetooth.addEventListener('enabled', update);
  bluetooth.addEventListener('disabled', update);
  switchButton.addEventListener('click', bluetoothSwitch);

  // Update bluetooth information in the first load
  update();
}

window.addEventListener('load', bluetoothTest);

