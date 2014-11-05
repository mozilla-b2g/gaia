/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

(function(exports) {
  var AppWindow = self.AppWindow;

  /**
   * This window is inherit the AppWindow, and modifies some properties
   * different from the later.
   *
   * @constructor SecureWindow
   * @augments AppWindow
   */
  var SecureWindow = function(configs) {
    AppWindow.call(this, configs);
  };

  /**
   * @borrows AppWindow.prototype as SecureWindow.prototype
   * @memberof SecureWindow
   */
  SecureWindow.prototype = Object.create(AppWindow.prototype);

  /**
   * We would maintain our own events by other components.
   *
   * @type string
   * @memberof SecureWindow
   */
  SecureWindow.prototype.eventPrefix = 'secure-app';

  /**
   * Different animation from the original window.
   *
   * @type string
   * @memberof SecureWindow
   */
  SecureWindow.prototype.openAnimation = 'fade-in';

  /**
   * Different animation from the original window.
   *
   * @type string
   * @memberof SecureWindow
   */
  SecureWindow.prototype.closeAnimation = 'fade-out';

  /**
   * SecureWindow has its own styles.
   *
   * @type string
   * @memberof SecureWindow
   */
  SecureWindow.prototype.CLASS_LIST = 'appWindow secureAppWindow';

  /**
   * Closes the window for a specified period of time before sending
   * a kill() to allow for the application to gracefully shutdown.
   *
   * @param {Number} delay Time (in milliseconds) to wait before
   *                       killing the window (Default: 5000)
   */
  SecureWindow.prototype.softKill = function sw_softKill(delay) {
    if (delay === 0) {
      this.kill();
      return;
    }

    // Prevent subsequent softKill() calls if one is already pending.
    if (this.isSoftKillPending()) {
      return;
    }

    delay = delay || 5000;

    // Close the window immediately.
    this.close();

    // Schedule the window for killing.
    var self = this;
    this.softKillTimeout = setTimeout(function() {
      console.log('[SecureWindow] softKill() - Killing now: ' +
                  self.manifestURL);

      self.kill();
      delete self.softKillTimeout;
    }, delay);

    console.log('[SecureWindow] softKill() - Scheduled for kill in ' +
                delay + 'ms: ' + this.manifestURL);
  };

  /**
   * Cancels a pending softKill() from killing the window.
   */
  SecureWindow.prototype.cancelSoftKill = function sw_cancelSoftKill() {
    if (this.softKillTimeout) {
      clearTimeout(this.softKillTimeout);
      delete this.softKillTimeout;

      console.log('[SecureWindow] cancelSoftKill() - Cancelled kill: ' +
                  this.manifestURL);
    }
  };

  /**
   * Checks if a softKill() is pending.
   * @return {Boolean} Flag indicating if a softKill() is pending
   */
  SecureWindow.prototype.isSoftKillPending =
    function sw_isSoftKillPending() {
      return !!this.softKillTimeout;
    };

  /**
   * @exports SecureWindow
   */
  exports.SecureWindow = SecureWindow;
})(self);
