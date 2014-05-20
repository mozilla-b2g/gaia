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
  var LockScreenWindow = function LockScreenWindow(configs) {
    AppWindow.call(this, configs);
  };

  LockScreenWindow.REGISTERED_EVENTS =
    ['mozbrowserclose', 'mozbrowsererror',
      'mozbrowservisibilitychange', 'mozbrowserloadend'];

  /**
   * @borrows AppWindow.prototype as LockScreenWindow.prototype
   * @memberof LockScreenWindow
   */
  LockScreenWindow.prototype = Object.create(AppWindow.prototype);

  /**
   * AppWindow need this to do some special handling.
   *
   * @type boolean
   * @memberof LockScreenWindow
   */
  LockScreenWindow.prototype.isLockScreen = true;

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
   * Register events from the static member.
   *
   * @this {LockScreenWindow}
   * @memberof LockScreenWindow
   */
  LockScreenWindow.prototype._registerEvents = function aw__registerEvents() {
    if (this.element === null) {
      this._dump();
      return;
    }
    // Need to read the `LockScreenWindow.REGISTERED_EVENTS` here because the
    // `AppWindow#_registerEvents` don't know anything about it.
    LockScreenWindow.REGISTERED_EVENTS.forEach(function iterator(evt) {
      this.element.addEventListener(evt, this);
    }, this);
  };

  /**
   * Need to derive this to restart the LockScreen window when it crashed.
   *
   * @param {event} evt
   * @this {LockScreenWindow}
   * @memberof LockScreenWindow
   */
  LockScreenWindow.prototype._handle_mozbrowsererror =
    function lw__handle_mozbrowsererror(evt) {
      if (evt.detail.type == 'fatal') {
        this.publish('crashed');
        this.restart();
      }
    };

  /**
   * If the crashing app is the lockscreen screen app and it is the
   * displaying app we will need to relaunch it right away.
   *
   * @this {LockScreenWindow}
   * @memberof LockScreenWindow
   */
  LockScreenWindow.prototype.restart = function lw_restart() {
    // If we're displayed, restart immediately.
    if (this.isActive()) {
      this.kill();

      // XXX workaround bug 810431.
      // we need this here and not in other situations
      // as it is expected that lockscreen frame is available.
      setTimeout(function() {
        // The states of this instance would not be restarted,
        // so we need to do this.
        this._killed = false;
        this.render();
        this.open();
      }.bind(this));
    } else {
      // Otherwise wait until next opening request.
      this.kill();
    }
  };

  /**
   * @exports LockScreenWindow
   */
  exports.LockScreenWindow = LockScreenWindow;
})(window);
