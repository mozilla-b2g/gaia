'use strict';
/* global SettingsListener */

(function(exports) {

  /**
   * Storage listenes to lock and unlock events and changes the
   * setting which controls automount behavior of USB storage.
   * Storage operates both on lock/unlock events, as well as the
   * ums.enabled setting which is set in the settings app.
   * @class Storage
   */
  function Storage() {
    // Disable ums by default
    this.setMode(this.automounterDisable);
    window.addEventListener('lock', this);
    window.addEventListener('unlock', this);

    SettingsListener.observe(this.umsEnabled, false, function umsChanged(val) {
      this._mode = this.modeFromBool(val);
      if (window.lockScreen && window.lockScreen.locked) {
        // covers startup
        // Setting mode due to screen locked
        this.setMode(this.automounterDisable);
      } else {
        // Setting mode due to change in ums.enabled
        this.setMode(this._mode);
      }
    }.bind(this));
  }

  Storage.prototype = {

    /**
     * ums.mode setting value when the automounter is disabled.
     * @memberof Storage.prototype
     * @type {Integer}
     */
    automounterDisable: 0,

    /**
     * ums.mode setting value when the automounter is enabled.
     * @memberof Storage.prototype
     * @type {Integer}
     */
    automounterEnable: 1,

    /**
     * ums.mode setting value when the automounter is disabled
     * during the lock event.
     * @type {Integer}
     */
    automounterDisableWhenUnplugged: 2,

    /**
     * The name of the setting to enable or disable USB storage.
     * @memberof Storage.prototype
     * @type {String}
     */
    umsEnabled: 'ums.enabled',

    /**
     * The name of the setting that defines automount behavior.
     * @memberof Storage.prototype
     * @type {String}
     */
    umsMode: 'ums.mode',

    /**
     * The current value of whether or not USB storage is enabled.
     * @memberof Storage.prototype
     * @type {String}
     */
    _mode: undefined,

    /**
     * Maps a ums.enabled onto an automount value.
     * @memberof Storage.prototype
     * @param {Integer} val The bool value that enables/disables automounting.
     * @return {Integer} The automount enabled/disabled value.
     */
    modeFromBool: function(val) {
       return val ? this.automounterEnable : this.automounterDisable;
    },

    /**
     * Sets the automount mode.
     * @memberof Storage.prototype
     * @param {Integer} val The value we are setting automount to.
     */
    setMode: function(val) {
      var param = {};
      param[this.umsMode] = val;
      SettingsListener.getSettingsLock().set(param);
    },

    /**
     * General event handler interface.
     * Updates the overlay with as we receive load events.
     * @memberof Storage.prototype
     * @param  {DOMEvent} evt The event.
     */
    handleEvent: function(e) {
      switch (e.type) {
        case 'lock':
          // Setting mode due to screen locked
          this.setMode(this.automounterDisableWhenUnplugged);
          break;
        case 'unlock':
          if (typeof(this._mode) == 'undefined') {
            return;
          }

          // Setting mode due to screen unlocked
          this.setMode(this._mode);
          break;
        default:
          return;
      }
    }
  };

  exports.Storage = Storage;

}(window));
