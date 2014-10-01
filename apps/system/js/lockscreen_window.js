/* globals LockScreenAgent */
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
    var configs = {
      url: window.location.href,
      manifest: {
        orientation: ['default']
      },
      name: 'Lockscreen',
      // No manifestURL + no chrome would cause a default chrome app
      manifestURL: window.location.href.replace('system', 'lockscreen') +
                  '/manifest.webapp',
      origin: window.location.origin.replace('system', 'lockscreen')
    };
    this.iframe = this.createFrame();

    this.lockScreenAgent = new LockScreenAgent(this.iframe);
    this.lockScreenAgent.start();
    AppWindow.call(this, configs);
    window.dispatchEvent(new CustomEvent('lockscreen-frame-bootstrap'));
  };

  /**
   * @borrows AppWindow.prototype as LockScreenWindow.prototype
   * @memberof LockScreenWindow
   */
  LockScreenWindow.prototype = Object.create(AppWindow.prototype);

  /**
   * We still need this before we put the lockreen inside an iframe.
   *
   * @type LockScreen
   * @memberof LockScreenWindow
   */
  LockScreenWindow.prototype.lockscreen = null;

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
    height = self.layoutManager.height;
    width = self.layoutManager.width;

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
  exports.LockScreenWindow = LockScreenWindow;
})(window);
