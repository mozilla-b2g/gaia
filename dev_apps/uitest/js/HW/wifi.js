'use strict';

function wifiTest() {
  var WiFiMACText = document.getElementById('address');
  var WiFiStateText = document.getElementById('state');
  var switchButton = document.getElementById('switch');

  var settings = window.navigator.mozSettings;
  var wifiManager;
  function update() {
    switchButton.checked = wifiManager.enabled;
    if (wifiManager.enabled) {
      WiFiStateText.textContent = 'On';
      WiFiMACText.textContent = wifiManager.macAddress;
    }
    else {
      WiFiStateText.textContent = 'Off';
      WiFiMACText.textContent = 'Not available';
    }
  }
  if ('mozWifiManager' in navigator) {
    wifiManager = navigator.mozWifiManager;
    // navigator.mozWifiManager does not have addEventListener()
    wifiManager.onenabled = update.bind(this);
    wifiManager.ondisabled = update.bind(this);
    update();
  }
  // Click on switch will only update settings and
  // it takes some time for hardware to turns on.
  // That's why we should listen to enabled/disabled event of wifi
  function wifiSwitch() {
    settings.createLock().set({'wifi.enabled': switchButton.checked});
  }
  switchButton.addEventListener('click', wifiSwitch);
}

window.addEventListener('load', wifiTest);
