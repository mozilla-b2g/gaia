/**
 * Battery is an Observable that wraps the platform battery object. It has two
 * observable properties: level and state.
 *
 * @module modules/battery
 */
define(function(require) {
  'use strict';

  var NavigatorBattery = require('modules/navigator/battery');
  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');

  /**
   * @class Battery
   * @requires module:modules/navigator/battery
   * @requires module:modules/base/module
   * @requires module:modules/mvvm/observable
   * @returns {Battery}
   */
  var Battery = Module.create(function Battery() {
    this.super(Observable).call(this);

    this._level = this._getLevel();
    this._state = this._getState();
    NavigatorBattery.addEventListener('levelchange', () => {
      this._level = this._getLevel();
    });
    NavigatorBattery.addEventListener('chargingchange', () => {
      this._state = this._getState();
    });
  }).extend(Observable);

  /**
   * An observable property indicating the current battery level.
   *
   * @access public
   * @readonly
   * @memberOf Battery.prototype
   * @type {String}
   */
  Observable.defineObservableProperty(Battery.prototype,
    'level', {
      readonly: true,
      value: ''
  });

  /**
   * An observable property indicating the current battery state.
   *
   * @access public
   * @readonly
   * @memberOf Battery.prototype
   * @type {String}
   */
  Observable.defineObservableProperty(Battery.prototype,
    'state', {
      readonly: true,
      value: ''
  });

  Battery.prototype._getLevel = function() {
    return Math.min(100, Math.round(NavigatorBattery.level * 100));
  };

  Battery.prototype._getState = function() {
    if (NavigatorBattery.charging) {
      return (this._getLevel() == 100) ? 'charged' : 'charging';
    } else {
      return 'unplugged';
    }
  };

  return Battery();
});
