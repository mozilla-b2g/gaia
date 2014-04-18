/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
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
        fullscreen: true,
        orientation: ['default']
      },
      name: 'Lockscreen',
      // No manifestURL + no chrome would cause a default chrome app
      manifestURL: window.location.href.replace('system', 'lockscreen') +
                  '/manifest.webapp',
      origin: window.location.origin.replace('system', 'lockscreen')
    };

    // Mock the iframe contains the elements with the existing
    // lockscreen div.
    this.iframe = this.createOverlay();
    AppWindow.call(this, configs);

    // XXX: Because we still have to create both LockScreenWindow
    // and LockScreen.
    this.lockscreen = new window.LockScreen();
    window.lockScreen = this.lockscreen;
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

  /**
   * LockScreenWindow has its own styles.
   *
   * @type string
   * @memberof LockScreenWindow
   */
  LockScreenWindow.prototype.CLASS_LIST = 'appWindow lockScreenWindow';

  /**
   * Create LockScreen overlay. This method would exist until
   * we make the overlay loaded from HTML file just like the
   * real iframe app.
   *
   * @this {LockScreenWindow}
   * @memberof LockScreenWindow
   */
  LockScreenWindow.prototype.createOverlay =
    function lsw_createOverlay() {
      var template = new window.Template('lockscreen-overlay-template'),
          html = template.interpolate(),
          dummy = document.createElement('div');

      dummy.innerHTML = html;
      var iframe = dummy.firstElementChild;
      iframe.setVisible = function() {};
      // XXX: real iframes would own these methods.
      iframe.addNextPaintListener = function(cb) {
        cb();
      };
      iframe.removeNextPaintListener = function() {};
      iframe.getScreenshot = function() {
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
      return iframe;
    };
  exports.LockScreenWindow = LockScreenWindow;
})(window);
