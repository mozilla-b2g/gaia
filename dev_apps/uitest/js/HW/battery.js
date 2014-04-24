'use strict';

function batteryTest() {
  var battery = window.navigator.battery;
  var charging = document.getElementById('charging');
  var level = document.getElementById('level');
  var chargingTime = document.getElementById('charging-time');
  var disChargingTime = document.getElementById('discharging-time');

  function update(evt) {
    charging.textContent = battery.charging;
    level.textContent = battery.level * 100;
    chargingTime.textContent = battery.chargingTime;
    disChargingTime.textContent = battery.dischargingTime;
  }

  battery.addEventListener('chargingchange', update);
  battery.addEventListener('levelchange', update);
  battery.addEventListener('onchargingtimechange', update);
  battery.addEventListener('ondischargingtimechange', update);

  update();
}

window.addEventListener('load', batteryTest);
