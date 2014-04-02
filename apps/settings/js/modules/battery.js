/**
 * Battery is an Observable that wraps the platform battery object. It has two
 * observable properties: level and state.
 */
define(function(require) {
  'use strict';

  var NavigatorBattery = require('modules/navigator/battery');
  var Observable = require('modules/mvvm/observable');

  var _getLevel = function b_getLevel() {
    return Math.min(100, Math.round(NavigatorBattery.level * 100));
  };

  var _getState = function b_getState() {
    if (NavigatorBattery.charging) {
      return (_getLevel() == 100) ? 'charged' : 'charging';
    } else {
      return 'unplugged';
    }
  };

  var Battery = Observable({
    level: _getLevel(),
    state: _getState()
  });

  NavigatorBattery.addEventListener('levelchange', function b_level() {
    Battery.level = _getLevel();
  });
  NavigatorBattery.addEventListener('chargingchange', function b_charging() {
    Battery.state = _getState();
  });

  return Battery;
});
