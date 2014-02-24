/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * This widget will load preset widgets.
 *
 * TODO: It's now use a const array to load
 * all widgets, but it should be able to load
 * this preset list from external resources,
 * so different build can launch different widgets.
 */
(function(exports) {

  var LockScreenBootstrapWidget = function() {
    window.LockScreenBasicWidget.call(this);
    return this;
  };

  /**
   * @borrows LockScreenBasicWidget.prototype as
   *          LockScreenBootstrapWidget.prototype
   * @memberof LockScreenBootstrapWidget
   */
  LockScreenBootstrapWidget.prototype =
    Object.create(window.LockScreenBasicWidget.prototype);
  LockScreenBootstrapWidget.prototype.configs = {
    events: [],
    widgets: [
      'Slide',
      'UnlockingSound'
    ],
    name: 'Bootstrap'
  };

  LockScreenBootstrapWidget.prototype.bootstrap =
  function lsbw_bootstrap() {
    this.configs.widgets.forEach((name)=> {
      this.requestInvokeWidget(name);
    });
  };

  LockScreenBootstrapWidget.prototype.activate =
  function lsbw_activated() {
    this.bootstrap();
  };

  LockScreenBootstrapWidget.prototype.deactivate =
  function lsbw_deactivated() {};

  /** @global LockScreenBootstrapWidget */
  exports.LockScreenBootstrapWidget = LockScreenBootstrapWidget;
})(window);
