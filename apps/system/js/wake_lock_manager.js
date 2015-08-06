'use strict';

(function(exports) {
  /**
   * WakeLockManagerBase tracked the current wake lock state of a given topic,
   * and expose the state in the 'isHeld' property.
   * Any response (e.g. set the cpuSleepAllowed property, or
   * reset the screen timeout) is the responsibility of the user and
   * should be handled within onwakelockchange callback.
   *
   * You should not be using the Base directly.
   * In fact, WakeLockManagerBase is not exported from this file.
   *
   * We implement nsIDOMWakeLockListener here; it's "callback" method
   * will be called by Gecko.
   * See mozilla-central/source/dom/power/nsIDOMWakeLockListener.idl
   */
  var WakeLockManagerBase = function WakeLockManagerBase() {
    this._started = false;
    this.isHeld = undefined;
  };

  WakeLockManagerBase.prototype.TOPIC = undefined;
  WakeLockManagerBase.prototype.ACCEPT_BACKBROUND_WAKE_LOCK = true;
  WakeLockManagerBase.prototype.onwakelockchange = null;
  // The state will be one of the three states:
  // 'unlocked', 'locked-foreground', or 'locked-background'.
  // See nsIDOMWakeLockListener.idl for detail.
  WakeLockManagerBase.prototype.setIsHeld = function(state) {
    if (this.ACCEPT_BACKBROUND_WAKE_LOCK) {
      this.isHeld = (state !== 'unlocked');
    } else {
      this.isHeld = (state === 'locked-foreground');
    }
  };
  WakeLockManagerBase.prototype.start = function() {
    if (!this.TOPIC) {
      throw new Error('WakeLockManagerBase: ' +
        'TOPIC is not set; you should not be using the base directly.');
    }
    if (this._started) {
      throw new Error(
        'WakeLockManagerBase: should not be start()\'ed twice.');
    }
    this._started = true;

    navigator.mozPower.addWakeLockListener(this);

    // Set the initial value
    var state = navigator.mozPower.getWakeLockState(this.TOPIC);
    this.setIsHeld(state);
  };
  WakeLockManagerBase.prototype.stop = function() {
    if (!this._started) {
      throw new Error('WakeLockManagerBase: ' +
        'Instance was never start()\'ed but stop() is called.');
    }
    this._started = false;

    navigator.mozPower.removeWakeLockListener(this);
    this._listener = null;
  };
  // This function will be called when wake lock state changes.
  WakeLockManagerBase.prototype.callback = function(topic, state) {
    if (topic !== this.TOPIC) {
      return;
    }

    var isPreviouslyHeld = this.isHeld;
    this.setIsHeld(state);
    if (this.isHeld !== isPreviouslyHeld &&
        typeof this.onwakelockchange === 'function') {
      this.onwakelockchange(this.isHeld);
    }
  };

  var ScreenWakeLockManager = function ScreenWakeLockManager() {
    WakeLockManagerBase.apply(this, arguments);
  };
  ScreenWakeLockManager.prototype =
    Object.create(WakeLockManagerBase.prototype);
  ScreenWakeLockManager.prototype.TOPIC = 'screen';
  // ScreenWakeLockManager does not accepting background wake lock
  // since hidden window has no right to keep the screen on.
  ScreenWakeLockManager.prototype.ACCEPT_BACKBROUND_WAKE_LOCK = false;

  var CpuWakeLockManager = function CpuWakeLockManager() {
    WakeLockManagerBase.apply(this, arguments);
  };
  CpuWakeLockManager.prototype = Object.create(WakeLockManagerBase.prototype);
  CpuWakeLockManager.prototype.TOPIC = 'cpu';

  var WifiWakeLockManager = function WifiWakeLockManager() {
    WakeLockManagerBase.apply(this, arguments);
  };
  WifiWakeLockManager.prototype = Object.create(WakeLockManagerBase.prototype);
  WifiWakeLockManager.prototype.TOPIC = 'wifi';

  exports.ScreenWakeLockManager = ScreenWakeLockManager;
  exports.CpuWakeLockManager = CpuWakeLockManager;
  exports.WifiWakeLockManager = WifiWakeLockManager;
}(window));
