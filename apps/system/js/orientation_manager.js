'use strict';

(function(window) {
  /**
   * OrientationManager manages the orientation.
   *
   *
   * There're some cases we need to reset the orientation of the top window:
   * * LockScreen is unlocked.
   * * AttentionScreen is hidden.
   * * AttentionScreen is closed.
   * * TrustedUI is closed.
   * * SleepMenu is hidden.
   *
   * Any of them occurs would trigger OrientationManager to dispatch
   * <code>reset-orientation</code> event and AppWindowManager would reset the
   * orientation of the active window.
   *
   * ![Change orientation flow](http://i.imgur.com/KCUgFH6.png)
   *
   * @module OrientationManager
   */
  window.OrientationManager = {
    init: function om_init() {
      this.fetchDefaultOrientation();
      if (SettingsListener) {
        SettingsListener.observe('screen.orientation.lock', false,
          function(value) {
            this.globalOrientation = value ?
              this.fetchCurrentOrientation() : null;
            this.publish('reset-orientation');
          }.bind(this));
      }

      window.addEventListener('will-unlock', this);
      window.addEventListener('attentionscreenhide', this);
      window.addEventListener('status-active', this);
      window.addEventListener('sleepmenuhide', this);
      window.addEventListener('trusteduiclose', this);
    },

    handleEvent: function om_handleEvent(evt) {
      switch (evt.type) {
        case 'attentionscreenhide':
        case 'status-active':
        case 'sleepmenuhide':
        case 'trusteduiclose':
        case 'will-unlock':
          // We don't need to reset orientation if lockscreen is locked.
          if (LockScreen.locked) {
            return;
          }
        /**
         * Fired when the orientation needs to be locked/unlocked again.
         * @event module:OrientationManager#reset-orientation
         */
          this.publish('reset-orientation');
          break;
      }
    },

    globalOrientation: null,

    /**
     * Default orientation of this device, possible values are:
     *
     * * portrait-primary
     * * landscape-primary
     *
     * @type {String}
     * @memberOf module:OrientationManager
     */
    defaultOrientation: screen.mozOrientation,

    /**
     * Test if our default orientation is portrait.
     * @return {Boolean} If our default orientation is portrait.
     * @memberOf module:OrientationManager
     */
    isDefaultPortrait: function() {
      return (this.defaultOrientation === 'portrait-primary');
    },

    /**
     * Record if we are on real device or not.
     * @access private
     * @type {Boolean}
     * @memberOf module:OrientationManager
     */
    _isOnRealDevice: undefined,

    /**
     * Test if we are on real device by checking the available width.
     * @return {Boolean} If we are on real device or not.
     * @memberOf module:OrientationManager
     */
    isOnRealDevice: function sl_isOnRealDevice() {
      if (typeof(this._isOnRealDevice) !== 'undefined')
        return this._isOnRealDevice;

      // XXX: A hack to know we're using real device or not
      // is to detect screen size.
      // The screen size of b2g running on real device
      // is the same as the size of system app.
      if (window.innerWidth === screen.availWidth) {
        this._isOnRealDevice = true;
      } else {
        this._isOnRealDevice = false;
      }

      return this._isOnRealDevice;
    },

    /**
     * Get the default orientation of the device when device booted.
     * This is a trick done by locking the orientation at first and
     * then get by <code>screen.mozOrientation</code>.
     *
     * If we are not on a real device, we will guess the orientation by
     * the ratio of width and height of window.
     *
     * @memberOf module:OrientationManager
     */
    fetchDefaultOrientation: function sl_fetchDefaultOrientation() {
      if (!this.isOnRealDevice()) {
        // Fallback to use width/height to calculate default orientation
        // if we're running on desktop browser or simulator.
        this.defaultOrientation = window.innerWidth > window.innerHeight ?
          'landscape-primary' : 'portrait-primary';
      } else {
        screen.mozLockOrientation('default');
        this.defaultOrientation = screen.mozOrientation;
      }
    },

    /**
     * Get current orientation
     * @return {String} Current orientation, possible values: portrait-primary,
     *                  portrait-secondary, landscape-primary,
     *                  landscape-secondary.
     *
     * @memberOf module:OrientationManager
     */
    fetchCurrentOrientation: function sl_fetchCurrentOrientation() {
      if (!this.isOnRealDevice()) {
        // Fallback to use width/height to calculate default orientation
        // if we're running on desktop browser or simulator.
        return window.innerWidth > window.innerHeight ?
          'landscape-primary' : 'portrait-primary';
      } else {
        return screen.mozOrientation;
      }
    },

    publish: function sl_publish(eventName, detail) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(eventName, true, false, detail);
      window.dispatchEvent(evt);
    }
  };

  OrientationManager.init();
}(this));
