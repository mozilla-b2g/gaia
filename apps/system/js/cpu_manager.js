'use strict';

/* global CpuWakeLockManager */

(function(exports) {
  /**
   * CpuManager is a tiny baby that does nothing except set the
   * |cpuSleepAllowed| property on mozPower.
   * But, it would probably grow up as all Gaia script do.
   */
  var CpuManager = function CpuManager() {
    this._wakeLockManager = null;
    this._started = false;
  };

  CpuManager.prototype.start = function() {
    if (this._started) {
      throw new Error(
        'CpuManager: should not be start()\'ed twice.');
    }

    if (!navigator.mozPower) {
      return;
    }
    this._started = true;

    this._wakeLockManager = new CpuWakeLockManager();
    this._wakeLockManager.onwakelockchange =
      this._handleWakeLockChange.bind(this);
    this._wakeLockManager.start();
  };

  CpuManager.prototype.stop = function() {
    if (!this._started) {
      throw new Error('CpuManager: ' +
        'Instance was never start()\'ed but stop() is called.');
    }
    this._started = false;

    this._wakeLockManager.stop();
    this._wakeLockManager = null;
  };

  CpuManager.prototype._handleWakeLockChange = function(isHeld) {
    navigator.mozPower.cpuSleepAllowed = !isHeld;
  };

  exports.CpuManager = CpuManager;
}(window));
