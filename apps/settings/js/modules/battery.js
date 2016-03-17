/**
 * Battery is an Observable that wraps the platform battery object. It has two
 * observable properties: level and state.
 *
 * @module modules/battery
 */
define(function(require) {
  'use strict';

  var BatteryPromise = require('modules/navigator/battery');

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


    this._ready = BatteryPromise.then(battery => {
      this._battery = battery;
      this._level = this._getLevel();
      this._state = this._getState();
      this._chargingTime = this._getChargingTime();
      this._dischargingTime = this._getDischargingTime();
      battery.addEventListener('levelchange', () => {
        this._level = this._getLevel();
      });
      battery.addEventListener('chargingchange', () => {
        this._state = this._getState();
        this._chargingTime = this._getChargingTime();
        this._dischargingTime = this._getDischargingTime();
      });
      battery.addEventListener('chargingtimechange', () => {
        this._chargingTime = this._getChargingTime();
      });
      battery.addEventListener('dischargingtimechange', () => {
        this._dischargingTime = this._getDischargingTime();
      });
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

  /**
   * An observable property indicating the current charging time.
   *
   * @access public
   * @readonly
   * @memberOf Battery.prototype
   * @type {String}
   */
  Observable.defineObservableProperty(Battery.prototype,
    'chargingTime', {
      readonly: true,
      value: ''
  });

  /**
   * An observable property indicating the current discharging time.
   *
   * @access public
   * @readonly
   * @memberOf Battery.prototype
   * @type {String}
   */
  Observable.defineObservableProperty(Battery.prototype,
    'dischargingTime', {
      readonly: true,
      value: ''
  });

  Battery.prototype._getLevel = function() {
    return Math.min(100, Math.round(this._battery.level * 100));
  };

  Battery.prototype._getState = function() {
    if (this._battery.charging) {
      return (this._getLevel() == 100) ? 'charged' : 'charging';
    } else {
      return 'unplugged';
    }
  };

  Battery.prototype._getChargingTime = function() {
    return this._battery.chargingTime;
  };

  Battery.prototype._getDischargingTime = function() {
    return this._battery.dischargingTime;
  };


  return Battery();
});
