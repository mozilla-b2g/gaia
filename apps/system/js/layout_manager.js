/* global inputWindowManager, softwareButtonManager, Service, AttentionWindow */
'use strict';

(function(exports) {
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
   * @requires SoftwareButtonManager
   * @requires StatusBar
   * @requires Service
   */
  var LayoutManager = function LayoutManager() {};

  LayoutManager.prototype = {
    DEBUG: false,
    CLASS_NAME: 'LayoutManager',
    /** @lends LayoutManager */

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
      var activeApp = Service.currentApp;
      var isFullScreenLayout = activeApp && activeApp.isFullScreenLayout();
      var softwareButtonHeight = Service.locked || isFullScreenLayout ?
        0 : softwareButtonManager.height;
      var keyboardHeight = this.keyboardEnabled ?
        inputWindowManager.getHeight() : 0;
      var height = window.innerHeight - keyboardHeight - softwareButtonHeight;

      // Normalizing the height so that it always translates to an integral
      // number of device pixels
      var dpx = window.devicePixelRatio;
      if ((height * dpx) % 1 !== 0) {
        height = Math.ceil(height * dpx) / dpx;
      }

      return height;
    },

    /**
     * Gives the possible width for a normal window.
     *
     * @memberOf LayoutManager
     */
    get width() {
      return window.innerWidth -
        ((Service.currentApp &&
          Service.currentApp.isFullScreenLayout()) ?
          0 : softwareButtonManager.width);
    },

    getHeightFor: function(currentWindow, ignoreKeyboard) {
      if (currentWindow instanceof AttentionWindow) {
        var keyboardHeight = this.keyboardEnabled && !ignoreKeyboard ?
          inputWindowManager.getHeight() : 0;
        var height = window.innerHeight - keyboardHeight -
          softwareButtonManager.height;

        // Normalizing the height so that it always translates to an integral
        // number of device pixels
        var dpx = window.devicePixelRatio;
        if ((height * dpx) % 1 !== 0) {
          height = Math.ceil(height * dpx) / dpx;
        }

        return height;
      }
      if (ignoreKeyboard) {
        return this.height + inputWindowManager.getHeight();
      } else {
        return this.height;
      }
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
      return (this.width === width && this.height === height);
    },

    /**
     * Record the keyboard is enabled now or not.
     * @type {Boolean}
     * @memberOf LayoutManager
     */
    keyboardEnabled: false,

    /**
     * The orientation we keep each time we encounter resize event.
     * @type {String}
     * @memberOf LayoutManager
     */
    _lastOrientation: undefined,

    /**
     * Startup. Adds all event listeners needed.
     * @return {LayoutManager} this object
     * @memberOf LayoutManager
     */
    start: function lm_start() {
      window.addEventListener('resize', this);
      window.addEventListener('keyboardchange', this);
      window.addEventListener('keyboardhide', this);
      window.addEventListener('mozfullscreenchange', this);
      window.addEventListener('software-button-enabled', this);
      window.addEventListener('software-button-disabled', this);
      window.addEventListener('attentionwindowmanager-deactivated', this);
      window.addEventListener('lockscreen-appclosed', this);

      this._lastOrientation = screen.mozOrientation;
    },

    handleEvent: function lm_handleEvent(evt) {
      this.debug('resize event got: ', evt.type);

      // The instance should be available on the evt.detail of
      // the system-resize event. Additionally, if the original event caused
      // the resize has a waitUntil() function, we would need the user of the
      // system-resize event to have access to that too.
      var systemResizeEventDetail = Object.create(this);
      if (evt.detail && typeof evt.detail.waitUntil === 'function') {
        systemResizeEventDetail.waitUntil = function(p) {
          return evt.detail.waitUntil(p);
        };
      }

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
          this.publish('system-resize', systemResizeEventDetail);
          break;
        case 'resize':
          // bug 1073806: do not publish |system-resize| if keyboard is showing
          // and we've just changed orientation: |keyboardchange| will trigger
          // later and we'll resize then.
          if (!(screen.mozOrientation !== this._lastOrientation &&
                this.keyboardEnabled)) {
            this.publish('system-resize', systemResizeEventDetail);
          }
          this.publish('orientationchange');
          this._lastOrientation = screen.mozOrientation;
          break;
        case 'lockscreen-appclosed':
          // If the software button is enabled it will be un-hidden when
          // the lockscreen is closed and trigger a system level resize.
          if (softwareButtonManager.enabled) {
            this.publish('system-resize', systemResizeEventDetail);
          }
          break;
        default:
          if (evt.type === 'keyboardhide') {
            this.keyboardEnabled = false;
          }
          this.publish('system-resize', systemResizeEventDetail);
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
      if (this.DEBUG) {
        console.log('[' + this.CLASS_NAME + ']' +
          '[' + Service.currentTime() + '] ' +
          Array.slice(arguments).concat());
      }
    }
  };
  exports.LayoutManager = LayoutManager;
}(window));
