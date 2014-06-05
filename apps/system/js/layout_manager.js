/* global KeyboardManager, softwareButtonManager, StatusBar,
          System */
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
    get fullWidth() {
      if (this._width) {
        return this._width;
      }

      this._width = window.innerWidth;
      return this._width;
    },

    /**
     * Gives the width for the screen.
     *
     * @memberOf LayoutManager
     */
    get fullHeight() {
      if (this._height) {
        return this._height;
      }

      this._height = window.innerHeight;
      return this._height;
    },

    /**
     * Gives the possible height for a window.
     *
     * @memberOf LayoutManager
     */
    get height() {
      return window.innerHeight -
        (this.keyboardEnabled ? KeyboardManager.getHeight() : 0) -
        StatusBar.height -
        softwareButtonManager.height;
    },

    /**
     * Gives the possible width for a normal window.
     *
     * @memberOf LayoutManager
     */
    get width() {
      return window.innerWidth;
    },

    keyboardHeight: 0,

    /**
     * Match the given size with current layout.
     * @param  {Number}  width        The matched width.
     * @param  {Number}  height       The matched height.
     * @return {Boolean}              Matches current layout or not.
     *
     * @memberOf LayoutManager
     */
    match: function lm_match(width, height) {
      return (this.fullHeight === height);
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
        case 'resize':
          delete this._width;
          delete this._height;
          this.publish('system-resize');
          break;
        case 'keyboardchange':
          if (document.mozFullScreen) {
            document.mozCancelFullScreen();
          }
          this.keyboardEnabled = true;
          this.keyboardHeight = KeyboardManager.getHeight();
          /**
           * Fired when layout needs to be adjusted.
           * @event LayoutManager#system-resize
           */
          this.publish('system-resize');
          break;
        default:
          if (evt.type === 'keyboardhide') {
            this.keyboardEnabled = false;
            this.keyboardHeight = 0;
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
