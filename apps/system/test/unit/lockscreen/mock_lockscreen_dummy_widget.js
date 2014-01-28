/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * This widget is only for test.
 */
(function(exports) {

  /**
   * @param {LockScreenMediator} mediator
   * @constructor LockScreenDummyWidget
   * @arguments LockScreenBasicWidget
   */
  var LockScreenDummyWidget = function(mediator) {
    window.LockScreenBasicWidget.call(this, mediator);
    this.setup();
    this.requestRegister();
  };

  /**
   * @borrows LockScreenBasicWidget.prototype as
   *          LockScreenDummyWidget.prototype
   * @memberof LockScreenSlideWidget
   */
  LockScreenDummyWidget.prototype =
    Object.create(window.LockScreenBasicWidget.prototype);

  /**
   * Set up the prototype of this instance.
   *
   * @this {LockScreenDummyWidget}
   * @member LockScreenDummyWidget
   */
  LockScreenDummyWidget.prototype.setup =
  function lsdw_setup() {
    this.states = {
      observeSettings: false,
      soundEnabled: false
    };

    this.configs = {
      // When these states get changed, will do some action.
      concernStates: ['will-unlock'],
      name: 'Dummy',
    };
  };

  /** @global LockScreenDummyWidget */
  exports.LockScreenDummyWidget = LockScreenDummyWidget;
})(window);
