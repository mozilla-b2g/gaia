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

  /**
   * @param {LockScreenMediator} mediator
   * @constructor LockScreenSlideWidget
   * @arguments LockScreenBasicWidget
   */
  var LockScreenSlideWidget = function(mediator) {
    window.LockScreenBasicWidget.call(this, mediator);
    this.setup();
    this.requestRegister();
  };

  /**
   * @borrows LockScreenBasicWidget.prototype as LockScreenSlideWidget.prototype
   * @memberof LockScreenSlideWidget
   */
  LockScreenSlideWidget.prototype =
    Object.create(window.LockScreenBasicWidget.prototype);

  /**
   * Set up the prototype of this instance.
   *
   * @this {LockScreenBasicWidget}
   * @member LockScreenBasicWidget
   */
  LockScreenSlideWidget.prototype.setup = function() {
    this.configs = {
      // Need to handle these events.
      slideEvents: [
        'lockscreenslide-activate-left',
        'lockscreenslide-activate-right',
        'lockscreenslide-unlocking-start',
        'lockscreenslide-unlocking-stop'
      ],
      name: 'Slide'
    };
  };

  /**
   * Handle events from the LockScreenSlide.
   * It's because the slide already as a shared component.
   * So we need to handle and forward the events it triggered in this way.
   *
   * @param {event} evt
   * @this {LockScreenSlideWidget}
   * @member LockScreenSlideWidget
   */
  LockScreenSlideWidget.prototype.handleEvent =
  function lssw_handleEvent(evt) {
    switch (evt.type) {
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

  /**
   * Overwrite the default notify function to dispatch and handle them.
   *
   * @this {LockScreenSlideWidget}
   * @member LockScreenSlideWidget
   * @public
   */
  LockScreenSlideWidget.prototype.notify =
  function lsusw_notify(message, channel) {
    if ('stateChanged' === message.type &&
        'locked' === message.content.name &&
        'will-unlock' === message.content.newVal) {
      this.deactivate();
      this.debug('>> notified state changed: ', message.content.newVal);
    }
  };

  /**
   * Overwrite the default notify function to be activated.
   * This widget would request a canvas to draw itself. That means,
   * the slide would take it and start the initialization.
   *
   * @this {LockScreenSlideWidget}
   * @member LockScreenSlideWidget
   * @public
   */
  LockScreenSlideWidget.prototype.activate =
  function lssw_activate() {
    this.super('activate')();
    this.super('requestCanvas')('id',
      'lockscreen-canvas', this.initSlide.bind(this));
  };

  /**
   * Overwrite the default notify function to be deactivated.
   *
   * @this {LockScreenSlideWidget}
   * @member LockScreenSlideWidget
   * @public
   */
  LockScreenSlideWidget.prototype.deactivate =
  function lssw_deactivate() {
    this.super('deactivate')();
  };

  /**
   * Initialize the shared component, the LockScreenSlide.
   *
   * @this {LockScreenSlideWidget}
   * @member LockScreenSlideWidget
   */
  LockScreenSlideWidget.prototype.initSlide =
  function lssw_initSlide(canvas) {
    this.listenSlideEvents();

    // TODO: Abstraction leak: the original slide would
    // find its own elements beyound the frame we got here.
    // Should fix it to restrict the slide only use components
    // inside the frame.
    this.slide = new window.LockScreenSlide();
  };

  /**
   * To invoke the camera if the user slided to the end.
   *
   * @this {LockScreenSlideWidget}
   * @member LockScreenSlideWidget
   */
  LockScreenSlideWidget.prototype.requestInvokeCamera =
  function lssw_requestInvokeCamera() {
    var content = {
          name: 'record',
          data: {'type': 'photos'}
        },
        onerror = ()=> {
          console.log('MozActivity: camera launch error.');
        };
    this.super('requestInvokeActivity')(content, onerror);
  };

  /**
   * To request unlocking if the user slided to the end.
   *
   * @this {LockScreenSlideWidget}
   * @member LockScreenSlideWidget
   */
  LockScreenSlideWidget.prototype.requestUnlock =
  function lssw_requestUnlock() {
    this.super('requestUnlock')();
  };

  /**
   * Post the message about sliding start.
   *
   * @this {LockScreenSlideWidget}
   * @member LockScreenSlideWidget
   */
  LockScreenSlideWidget.prototype.notifyUnlockingStart =
  function lssw_notifyUnlockingStart() {
    // Forwarding because screen manager need this.
    this.post('unlocking-start');
  };

  /**
   * Post the message about sliding stop.
   *
   * @this {LockScreenSlideWidget}
   * @member LockScreenSlideWidget
   */
  LockScreenSlideWidget.prototype.notifyUnlockingStop =
  function lssw_notifyUnlockingStop() {
    // Forwarding because screen manager need this.
    this.post('unlocking-stop');
  };

  /**
   * Start to listen sliding events.
   *
   * @this {LockScreenSlideWidget}
   * @member LockScreenSlideWidget
   */
  LockScreenSlideWidget.prototype.listenSlideEvents =
  function lssw_listenSlideEvents() {
    this.configs.slideEvents.forEach((ename)=> {
      window.addEventListener(ename, this);
    });
  };

  /**
   * Stop to listen sliding events.
   *
   * @this {LockScreenSlideWidget}
   * @member LockScreenSlideWidget
   */
  LockScreenSlideWidget.prototype.suspendSlideEvents =
  function lssw_suspendSlideEvents() {
    this.configs.slideEvents.forEach((ename)=> {
      window.removeEventListener(ename, this);
    });
  };

  /** @exports LockScreenSlideWidget */
  exports.LockScreenSlideWidget = LockScreenSlideWidget;
})(window);
