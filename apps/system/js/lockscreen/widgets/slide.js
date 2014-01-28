/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/**
 * The widget for the LockScreenSlide.
 * It's actually an adapter, which would forward the original
 * events from LockScreenSlide as new events, to fit the
 * new architecture.
 */
(function(exports) {

  var LockScreenSlideWidget = function() {
    window.LockScreenBasicWidget.call(this);
    return this;
  };

  /**
   * @borrows LockScreenBasicWidget.prototype as LockScreenSlideWidget.prototype
   * @memberof LockScreenSlideWidget
   */
  LockScreenSlideWidget.prototype =
    Object.create(window.LockScreenBasicWidget.prototype);
  LockScreenSlideWidget.prototype.configs = {
    events: ['will-unlock'],
    slideEvents: [
      'lockscreenslide-activate-left',
      'lockscreenslide-activate-right',
      'lockscreenslide-unlocking-start',
      'lockscreenslide-unlocking-stop'
    ],
    name: 'Slide'
  };

  LockScreenSlideWidget.prototype.handleEvent =
  function lssw_handleEvent(evt) {
    switch (evt.type) {
      case 'will-unlock':
        this.publish('lockscreen-unregister-widget');
        break;
      case 'lockscreenslide-activate-left':
        this.requestInvokeCamera();
        break;
      case 'lockscreenslide-activate-right':
        this.requestUnlock();
        break;
      case 'lockscreenslide-unlocking-start':
        this.notifyUnlockingStart();
        break;
      case 'lockscreenslide-unlocking-stop':
        this.notifyUnlockingStop();
        break;
    }
  };

  LockScreenSlideWidget.prototype.activate =
  function lssw_activate() {
    this.super().activate.bind(this)();
    this.super().requestCanvas.bind(this, 'id',
      'lockscreen-canvas', this.initSlide.bind(this))();
  };

  LockScreenSlideWidget.prototype.deactivate =
  function lssw_deactivate() {
    this.super().deactivate.bind(this)();
  };

  LockScreenSlideWidget.prototype.initSlide =
  function lssw_initSlide(canvas) {
    this.listenSlideEvents();

    // TODO: Abstraction leak: the original slide would
    // find its own elements beyound the frame we got here.
    // Should fix it to restrict the slide only use components
    // inside the frame.
    this.slide = new window.LockScreenSlide();
  };

  LockScreenSlideWidget.prototype.requestInvokeCamera =
  function lssw_requestInvokeCamera() {
    var content = {
          name: 'record',
          data: {'type': 'photos'}
        },
        onerror = ()=> {
          console.log('MozActivity: camera launch error.');
        };
    this.super().requestInvokeActivity
      .bind(this, content, onerror)();
  };

  LockScreenSlideWidget.prototype.requestUnlock =
  function lssw_requestUnlock() {
    this.super().requestUnlock.bind(this)();
  };

  LockScreenSlideWidget.prototype.notifyUnlockingStart =
  function lssw_notifyUnlockingStart() {
    // Forwarding because screen manager need this.
    this.publish('unlocking-start');
  };

  LockScreenSlideWidget.prototype.notifyUnlockingStop =
  function lssw_notifyUnlockingStop() {
    // Forwarding because screen manager need this.
    this.publish('unlocking-stop');
  };

  LockScreenSlideWidget.prototype.listenSlideEvents =
  function lssw_listenSlideEvents() {
    this.configs.slideEvents.forEach((ename)=> {
      window.addEventListener(ename, this);
    });
  };

  LockScreenSlideWidget.prototype.suspendSlideEvents =
  function lssw_suspendSlideEvents() {
    this.configs.slideEvents.forEach((ename)=> {
      window.removeEventListener(ename, this);
    });
  };

  /** @exports LockScreenSlideWidget */
  exports.LockScreenSlideWidget = LockScreenSlideWidget;
})(window);
