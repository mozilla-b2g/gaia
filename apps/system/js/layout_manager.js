/* global KeyboardManager, softwareButtonManager, StatusBar,
          System, lockScreen */
'use strict';

(function(exports) {
  var DEBUG = false;
  /**
   * LayoutManager gathers all external events which would affect
   * the layout of the windows and redirect the event to AppWindowManager.
   *
   *
   * The height of the windows would be affected by some global factor:
   *
   *
   * * The height of StatusBar.
   * * The existence of Software Home Button.
   * * The existence of Keyboard.
   *
   *
   * When the size state of one of them is changed, LayoutManager
   * would send <code>system-resize</code> event.
   *
   * ![resize layout flow](http://i.imgur.com/bUMm4VM.png)
   *
   * @class LayoutManager
   * @requires KeyboardManager
   * @requires SoftwareButtonManager
   * @requires StatusBar
   * @requires System
   */
  var LayoutManager = function LayoutManager() {};

  LayoutManager.prototype = {
    /** @lends LayoutManager */

    /**
     * Gives the width for the screen.
     *
     * @memberOf LayoutManager
     */
    get clientWidth() {
      if (this._clientWidth) {
        return this._clientWidth;
      }

      this._clientWidth = document.documentElement.clientWidth;
      return this._clientWidth;
    },

    /**
     * Gives the possible height for a window.
     *
     * @memberOf LayoutManager
     */
    get height() {
      if (lockScreen.locked) {
        return window.innerHeight;
      } else {
        return window.innerHeight -
          (this.keyboardEnabled ? KeyboardManager.getHeight() : 0) -
          StatusBar.height -
          softwareButtonManager.height;
      }
    },

    /**
     * Gives the possible width for a normal window.
     *
     * @memberOf LayoutManager
     */
    get width() {
      return window.innerWidth;
    },

    /**
     * Match the given size with current layout.
     * @param  {Number}  width        The matched width.
     * @param  {Number}  height       The matched height.
     * @return {Boolean}              Matches current layout or not.
     *
     * @memberOf LayoutManager
     */
    match: function lm_match(width, height) {
      return (this.height === height);
    },

    /**
     * Record the keyboard is enabled now or not.
     * @type {Boolean}
     * @memberOf LayoutManager
     */
    keyboardEnabled: false,

    /**
     * Startup. Adds all event listeners needed.
     * @return {LayoutManager} this object
     * @memberOf LayoutManager
     */
    start: function lm_start() {
      window.addEventListener('resize', this);
      window.addEventListener('status-active', this);
      window.addEventListener('status-inactive', this);
      window.addEventListener('keyboardchange', this);
      window.addEventListener('keyboardhide', this);
      window.addEventListener('attentionscreenhide', this);
      window.addEventListener('mozfullscreenchange', this);
      window.addEventListener('software-button-enabled', this);
      window.addEventListener('software-button-disabled', this);
      return this;
    },

    handleEvent: function lm_handleEvent(evt) {
      this.debug('resize event got: ', evt.type);
      switch (evt.type) {
        case 'keyboardchange':
          if (document.mozFullScreen) {
            document.mozCancelFullScreen();
          }
          this.keyboardEnabled = true;
          /**
           * Fired when layout needs to be adjusted.
           * @event LayoutManager#system-resize
           */
          this.publish('system-resize');
          break;
        default:
          if (evt.type === 'keyboardhide') {
            this.keyboardEnabled = false;
          }
          this.publish('system-resize');
          break;
      }
    },

    publish: function lm_publish(event, detail) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent(event, true, false, detail || this);

      this.debug('publish: ' + event);
      window.dispatchEvent(evt);
    },

    debug: function lm_debug() {
      if (DEBUG) {
        console.log('[LayoutManager]' +
          '[' + System.currentTime() + ']' +
          Array.slice(arguments).concat());
      }
    }
  };
  exports.LayoutManager = LayoutManager;
}(window));
