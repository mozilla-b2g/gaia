/* globals LockScreenAgent, LazyLoader */
/* global Service */
'use strict';

(function(exports) {
  var AppWindow = window.AppWindow;

  /**
   * This window is inherit the AppWindow, and modifies some properties
   * different from the later.
   *
   * @constructor LockScreenWindow
   * @augments AppWindow
   */
  var LockScreenWindow = function() {
    // Before we make lockscreen as an app (Bug 898348 ), which would
    // own its own manifest, we must mock a manifest for him.
    this.configs = {
      url: window.location.href,
      manifest: {
        orientation: ['default']
      },
      name: 'Lockscreen',
      // No manifestURL + no chrome would cause a default chrome app
      manifestURL: window.location.href.replace('system', 'lockscreen') +
                  '/manifest.webapp',
      origin: window.location.origin.replace('system', 'lockscreen'),
      inputWindow: {
        resizeMode: false
      }
    };
    this.iframe = this.createFrame();

    LazyLoader.load(['js/lockscreen_agent.js']).then(() => {
      this.lockScreenAgent = new LockScreenAgent(this.iframe);
      this.lockScreenAgent.start();
    }).catch((err) => {
      console.error(err);
    });
    AppWindow.call(this, this.configs);
    window.dispatchEvent(new CustomEvent('lockscreen-frame-bootstrap'));
  };

  /**
   * @borrows AppWindow.prototype as LockScreenWindow.prototype
   * @memberof LockScreenWindow
   */
  LockScreenWindow.prototype = Object.create(AppWindow.prototype);

  LockScreenWindow.prototype.constructor = LockScreenWindow;

  LockScreenWindow.prototype.isLockscreen = true;

  LockScreenWindow.SUB_COMPONENTS = {
    'transitionController': 'AppTransitionController',
    'statusbar': 'AppStatusbar'
  };

  LockScreenWindow.REGISTERED_EVENTS = AppWindow.REGISTERED_EVENTS;

  /**
   * We still need this before we put the lockreen inside an iframe.
   *
   * @type LockScreen
   * @memberof LockScreenWindow
   */
  LockScreenWindow.prototype.lockscreen = null;

  LockScreenWindow.prototype.HIERARCHY_MANAGER = 'LockScreenWindowManager';

  /**
   * We would maintain our own events by other components.
   *
   * @type string
   * @memberof LockScreenWindow
   */
  LockScreenWindow.prototype.eventPrefix = 'lockscreen-app';

  /**
   * Different animation from the original window.
   *
   * @type string
   * @memberof LockScreenWindow
   */
  LockScreenWindow.prototype.openAnimation = 'immediate';

  /**
   * Different animation from the original window.
   *
   * @type string
   * @memberof LockScreenWindow
   */
  LockScreenWindow.prototype.closeAnimation = 'fade-out';

  LockScreenWindow.prototype._DEBUG = false;

  /**
   * LockScreenWindow has its own styles.
   *
   * @type string
   * @memberof LockScreenWindow
   */
  LockScreenWindow.prototype.CLASS_LIST = 'appWindow lockScreenWindow';
  LockScreenWindow.prototype.CLASS_NAME = 'LockScreenWindow';

  LockScreenWindow.prototype._resize = function aw__resize() {
    var height, width;

    // We want the lockscreen to go below the StatusBar
    height = Service.query('LayoutManager.height') || window.innerHeight;
    width = Service.query('LayoutManager.width') || window.innerWidth;

    this.width = width;
    this.height = height;
    this.element.style.width = this.width + 'px';
    this.element.style.height = this.height + 'px';

    this.resized = true;

    /**
     * Fired when the app is resized.
     *
     * @event LockScreenWindow#lockscreen-appresize
     */
    this.publish('resize');
  };

  /**
   * Create the iframe and load it.
   *
   * @this {LockScreenWindow}
   * @memberof LockScreenWindow
   */
  LockScreenWindow.prototype.createFrame =
    function lsw_createFrame() {
      // XXX: Before we can make LockScreen as a real app,
      // we need these.
      var frame = document.getElementById('lockscreen-frame');
      frame.setVisible = function() {};
      // XXX: real mozbrowser iframes would own these methods.
      frame.addNextPaintListener = function(cb) {
        cb();
      };
      frame.removeNextPaintListener = function() {};
      frame.getScreenshot = function() {
        // Mock the request.
        return {
          get onsuccess() {return null;},
          set onsuccess(cb) {
            var mockEvent = {
              target: {result: null}
            };
            cb(mockEvent);
          }
        };
      };
      frame.removeAttribute('hidden');
      return frame;
    };

  LockScreenWindow.prototype.getNotificationContainer =
    function lsw_getNotificationContainer() {
      // XXX: After we make LockScreen as an app, needn't this anymore.
      return document.getElementById(
        'notifications-lockscreen-container');
    };

  LockScreenWindow.prototype._resize =
    function lsw__resize() {
      var height, width;
      this.debug('force RESIZE...');
      if (this.inputWindow.isActive()) {
        /**
         * The event is dispatched on the app window only when keyboard is up.
         *
         * @access private
         * @event LockScreenWindow~_withkeyboard
         */
        this.broadcast('withkeyboard');
      } else {
        /**
         * The event is dispatched on the LockScreen window only
         * when keyboard is hidden.
         *
         * @access private
         * @event LockScreenWindow~_withoutkeyboard
         */
        this.broadcast('withoutkeyboard');
      }
      height = this.layoutHeight();
      width = this.layoutWidth();

      this.width = width;
      this.height = height;
      this.element.style.width = this.width + 'px';
      this.element.style.height = this.height + 'px';

      this.browser.element.style.width = '';
      this.browser.element.style.height = '';

      this.resized = true;
      if (this.screenshotOverlay) {
        this.screenshotOverlay.style.visibility = '';
      }

      /**
       * Fired when the app is resized.
       *
       * @event LockScreenWindow#lockscreen-appresize
       */
      this.publish('resize');
      this.debug('W:', this.width, 'H:', this.height);
    };

  // XXX Bug 1085226: Before we make LockScreen use real keyboard, we need this.
  LockScreenWindow.prototype.layoutHeight =
    function lwm_layoutHeight() {
      // Whether we can resize or not (depends on if the content
      // is inside an iframe or not).
      if (!this.configs.inputWindow.resizeMode) {
        return window.innerHeight;
      }
      var softwareButtonHeight = this.isActive()  ?
        0 : (Service.query('SoftwareButtonManager.height') || 0);
      var inputWindowHeight = 0;
      if (this.states.instance && this.states.instance.inputWindow.isActive()) {
        inputWindowHeight = this.configs.inputWindow.height;
      }
      var height = window.innerHeight -
        inputWindowHeight -
        softwareButtonHeight;

      // Normalizing the height so that it always translates to an integral
      // number of device pixels
      var dpx = window.devicePixelRatio;
      if ((height * dpx) % 1 !== 0) {
        height = Math.ceil(height * dpx) / dpx;
      }

      return height;
    };

  LockScreenWindow.prototype.layoutWidth =
    function() {
      return window.innerWidth;
    };

  LockScreenWindow.prototype.lockOrientation =
    function() {
      // XXX: When we turn the screen on, try to lock the orientation
      // until it works. It may fail at the moment the screenchange
      // event has been fired, so we may need to try it several times.
      var tryLockOrientation = () => {
        if (screen.mozLockOrientation('portrait-primary')) {
          if (!this.orientationLockID) {
            throw new Error('No orientation ID. This function should only' +
                'be invoked as a interval callback');
          }
          window.clearInterval(this.orientationLockID);
          this.orientationLockID = null;
        }
      };
      if (Service.query('isOnRealDevice')) {
        if (this.orientationLockID) {
          // The previous one still present and was not cleared,
          // so do nothing.
          return;
        }
        this.orientationLockID =
          window.setInterval(tryLockOrientation, 4);
        // 4ms is the minimum interval according to W3C#setTimeout standard.
      }
    };

  exports.LockScreenWindow = LockScreenWindow;
})(window);
