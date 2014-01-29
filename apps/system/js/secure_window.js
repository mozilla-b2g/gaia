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
   * @exports SecureWindow
   */
  exports.SecureWindow = SecureWindow;
})(self);
