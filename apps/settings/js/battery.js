/* -*- Mode: js; js-indent-level: 2; indent-tabs-mode: nil -*- */
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var Battery = (function Battery() {
  var _battery = null;
  var _callback = null;
  var _debug = false;

  function debug(msg) {
    if (!_debug)
      return;

    console.log('+++Battery+++: ' + msg);
  }

  function init(callback) {
    _battery = window.navigator.battery;
    _callback = callback;
    if (!_battery) {
      console.error('Could not get window.navigator.battery');
      return;
    }
    attachListeners();
  }

  function attachListeners() {
    _battery.addEventListener('chargingchange', handleEvent);
    _battery.addEventListener('levelchange', handleEvent);
    window.addEventListener('localized', handleEvent);
  }

  function detachListeners() {
    _battery.removeEventListener('chargingchange', handleEvent);
    _battery.removeEventListener('levelchange', handleEvent);
    window.removeEventListener('localized', handleEvent);
  }

  function handleEvent(evt) {
    debug('level ' + _battery.level);
    debug('charging ' + _battery.charging);
    debug('discharge ' + _battery.dischargingTime);
    debug('charge ' + _battery.chargingTime);

    if (_callback)
      _callback(_battery);
  }

  function getBatteryInfo() {
    if (_callback)
      _callback(_battery);
  }

  return {
    init: init,
    attachListeners: attachListeners,
    detachListeners: detachListeners,
    update: getBatteryInfo
  };
})();

navigator.mozL10n.ready(function SettingsBattery() {
  function updateInfo(battery) {
    var _ = navigator.mozL10n.get;

    // display the current battery level
    var level = Math.min(100, Math.round(battery.level * 100));
    var state = 'unplugged';
    if (battery.charging) {
      state = (level == 100) ? 'charged' : 'charging';
    }
    var text = _('batteryLevel-percent-' + state, { level: level });

    var batteryLevel = document.querySelector('#battery-level *');
    if (batteryLevel) {
      batteryLevel.textContent = text;
    }

    var batteryDesc = document.getElementById('battery-desc');
    if (batteryDesc) {
      batteryDesc.textContent = text;
    }
  }

  var battery = window.navigator.battery;
  Battery.init(updateInfo);
  Battery.update();

  document.addEventListener('visibilitychange', function visibilityChange() {
    if (!document.hidden) {
      Battery.attachListeners();
      Battery.update();
    } else {
      Battery.detachListeners();
    }
  });

  window.addEventListener('panelready', function(e) {
    if (e.detail.current === '#battery') {
      Battery.update();
    }
  });
});
