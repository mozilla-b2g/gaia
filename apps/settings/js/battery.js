/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
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

  function handleEvent(evt) {
    debug('level ' + _battery.level);
    debug('charging ' + _battery.charging);
    debug('discharge ' + _battery.dischargingTime);
    debug('charge ' + _battery.chargingTime);

    if (_callback)
      _callback(_battery);
  }

  function registerEvents() {
    _battery.addEventListener('chargingchange', handleEvent);
    _battery.addEventListener('levelchange', handleEvent);
  }

  function unRegisterEvents() {
    _battery.removeEventListener('chargingchange', handleEvent);
    _battery.removeEventListener('levelchange', handleEvent);
  }

  function _init(callback) {
    _battery = window.navigator.battery;
    if (!_battery) {
      console.error('Could not get window.navigator.battery');
      return;
    }

    _callback = callback;
    registerEvents();
  }

  return {
    init: _init,
    registerEvents: registerEvents,
    unRegisterEvents: unRegisterEvents
  };

})();

window.addEventListener('localized', function SettingsBattery(evt) {

  function updateInfo(battery) {
    var _ = navigator.mozL10n.get;

    // display the current battery level
    var element = document.querySelector('#battery-level span');
    var level = Math.min(100, Math.round(battery.level * 100));
    element.textContent = _('batteryLevel-percent-' +
      (battery.charging ? 'charging' : 'unplugged'), { level: level });

    // TODO: display the estimated discharging/charging time
    element = document.querySelector('#battery-remaining span');
    element.textContent = battery.dischargingTime;
  }

  var battery = window.navigator.battery;
  Battery.init(updateInfo);
  updateInfo(battery);

  document.addEventListener('mozvisibilitychange', function visibilityChange() {
    if (!document.mozHidden) {
      Battery.registerEvents();
      updateInfo(battery);
    } else {
      Battery.unRegisterEvents();
    }
  });
});

