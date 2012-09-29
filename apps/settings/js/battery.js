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

  function handleEvent(evt) {
    debug('level ' + _battery.level);
    debug('charging ' + _battery.charging);
    debug('discharge ' + _battery.dischargingTime);
    debug('charge ' + _battery.chargingTime);

    if (_callback)
      _callback(_battery);
  }

  function attachListeners() {
    _battery.addEventListener('chargingchange', handleEvent);
    _battery.addEventListener('levelchange', handleEvent);
  }

  function detachListeners() {
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
    attachListeners();
  }

  return {
    init: _init,
    attachListeners: attachListeners,
    detachListeners: detachListeners
  };

})();

window.addEventListener('localized', function SettingsBattery(evt) {

  function updateInfo(battery) {
    var _ = navigator.mozL10n.get;

    // display the current battery level
    var level = Math.min(100, Math.round(battery.level * 100));
    var state = 'unplugged';

    if (battery.charging && level == 100) {
      state = 'charged';
    } else if (battery.charging) {
      state = 'charging';
    }

    var text = _('batteryLevel-percent-' + state,
                 { level: level });

    var element = document.getElementById('battery-level').firstElementChild;
    element.textContent = text;

    element = document.getElementById('battery-desc');
    element.textContent = text;
  }

  var battery = window.navigator.battery;
  Battery.init(updateInfo);
  updateInfo(battery);

  document.addEventListener('mozvisibilitychange', function visibilityChange() {
    if (!document.mozHidden) {
      Battery.attachListeners();
      updateInfo(battery);
    } else {
      Battery.detachListeners();
    }
  });
});

