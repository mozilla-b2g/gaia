'use strict';

function bluetoothTest() {
  var bluetooth = window.navigator.mozBluetooth;
  var settings = window.navigator.mozSettings;
  var switchButton = document.getElementById('switch');
  var state = document.getElementById('state');
  var address = document.getElementById('address');
  var version = document.getElementById('version');
  var btHelper = new BluetoothHelper();

  function update() {
    var req = settings.createLock().get('bluetooth.enabled');
    req.onsuccess = function() {
      var isBluetoothEnabled = req.result['bluetooth.enabled'];
      switchButton.checked = isBluetoothEnabled;
      if (!isBluetoothEnabled) {
        state.innerHTML = 'Off';
        address.innerHTML = 'unknown';
      }
      else {
        state.innerHTML = 'On';
        if (!btHelper.v2) {
          btHelper.getAddress(function bt_gotAddress(addr) {
            if (isBluetoothEnabled) {
              address.innerHTML = addr;
            }
          });
        }
      }
    };
  }

  // Click on switch will only update settings and
  // it takes some time for bluetooth hardware to turns on.
  // That's why we should listen to 'enabled' event of bluetooth
  function bluetoothSwitch() {
    settings.createLock().set({'bluetooth.enabled': switchButton.checked});
    // set enabled stat for BT APIv2
    if (switchButton.checked) {
      btHelper.enable();
    } else {
      btHelper.disable();
    }
  }

  if (btHelper.v2) {
    version.textContent = "v2";
    bluetooth.addEventListener('attributechanged', (evt) => {
      for (var i in evt.attrs) {
        switch (evt.attrs[i]) {
          case 'defaultAdapter':
            var adapter = bluetooth.defaultAdapter;
            if (adapter.address) { // for default On case
              address.innerHTML = adapter.address;
            }
            adapter.addEventListener('attributechanged', (evt) => {
              for (var i in evt.attrs) {
                switch (evt.attrs[i]) {
                  case 'state':
                    if (adapter.state === 'enabled') {
                      switchButton.checked = true;
                      state.innerHTML = 'On';
                    } else if (adapter.state === 'disabled') {
                      switchButton.checked = false;
                      state.innerHTML = 'Off';
                      address.innerHTML = 'unknown';
                    }
                    break;
                  case 'address':
                    address.innerHTML = adapter.address;
                    break;
                  default:
                    break;
                }
              }
            });
            break;
          default:
            break;
        }
      }
    });
  } else {
    version.textContent = "v1";
    bluetooth.addEventListener('adapteradded', update);
    bluetooth.addEventListener('enabled', update);
    bluetooth.addEventListener('disabled', update);
  }
  
  // init
  switchButton.addEventListener('click', bluetoothSwitch);

  // Update bluetooth information in the first load
  update();
}

window.addEventListener('load', bluetoothTest);

