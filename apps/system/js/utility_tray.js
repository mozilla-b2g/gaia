/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var UtilityTray = {
  shown: false,

  active: false,

  overlay: document.getElementById('utility-tray'),

  statusbar: document.getElementById('statusbar'),

  firstShown: document.getElementById('utility-tray-first-shown'),

  gripBar: document.getElementById('utility-tray-grippy'),

  screen: document.getElementById('screen'),

  init: function ut_init() {
    var touchEvents = ['touchstart', 'touchmove', 'touchend'];

    // XXX: Always use Mouse2Touch here.
    // We cannot reliably detect touch support normally
    // by evaluate (document instanceof DocumentTouch) on Desktop B2G.
    touchEvents.forEach(function bindEvents(name) {
      // window.addEventListener(name, this);
      Mouse2Touch.addEventHandler(window, name, this);
    }, this);

    window.addEventListener('screenchange', this);

    this.overlay.addEventListener('transitionend', this);
  },

  handleEvent: function ut_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        if (this.shown && !evt.detail.screenEnabled)
          this.hide(true);

        break;

      case 'touchstart':
        if (LockScreen.locked)
          return;
        if (evt.target !== this.overlay &&
            evt.target !== this.statusbar)
          return;

        this.active = true;
        // XXX: required for Mouse2Touch fake events to function
        evt.target.setCapture(true);

        this.onTouchStart(evt.touches[0]);
        break;

      case 'touchmove':
      if (!this.active)
        return;

        this.onTouchMove(evt.touches[0]);
        break;

      case 'touchend':
        if (!this.active)
          return;

        this.active = false;
        // XXX: required for Mouse2Touch fake events to function
        document.releaseCapture();

        this.onTouchEnd(evt.changedTouches[0]);
        break;

      case 'transitionend':
        if (!this.shown)
          this.screen.classList.remove('utility-tray');
        break;
    }
  },

  onTouchStart: function ut_onTouchStart(touch) {
    this.startX = touch.pageX;
    this.startY = touch.pageY;
    this.screen.classList.add('utility-tray');
    this.onTouchMove({ pageY: touch.pageY });
  },

  onTouchMove: function ut_onTouchMove(touch) {
    var screenHeight = this.overlay.getBoundingClientRect().height,
        gripBarHeight = this.gripBar.getBoundingClientRect().height,
        dy = -(this.startY - touch.pageY),
        newHeight;
    if (this.shown)
      dy += screenHeight;
    dy = Math.min(screenHeight, dy);

    if (dy > gripBarHeight) {
      var firstShownHeight = this.firstShown.getBoundingClientRect().height;

      if (dy < firstShownHeight + gripBarHeight) {
        newHeight = screenHeight - firstShownHeight - gripBarHeight;
      } else {
        newHeight = screenHeight - dy;
      }
      this.firstShown.style.MozTransition = '';
      this.firstShown.style.MozTransform = 'translateY(' + newHeight + 'px)';
    }

    var style = this.overlay.style;
    style.MozTransition = '';
    style.MozTransform = 'translateY(' + dy + 'px)';
  },

  onTouchEnd: function ut_onTouchEnd(touch) {
    var screenHeight = this.overlay.getBoundingClientRect().height;
    var dy = -(this.startY - touch.pageY);
    var offset = Math.abs(dy);

    if (!this.shown && offset == 0)
      this.hide(true);

    if ((!this.shown && offset > screenHeight / 4) ||
        (this.shown && offset < 10)) {
      this.show();
    } else {
      this.hide();
    }
  },

  hide: function ut_hide(instant) {
    var alreadyHidden = !this.shown;
    var style = this.overlay.style;
    style.MozTransition = instant ? '' : '-moz-transform 0.2s linear';
    style.MozTransform = 'translateY(0)';
    this.shown = false;
    if (instant)
      this.screen.classList.remove('utility-tray');

    if (!alreadyHidden) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('utilitytrayhide', true, true, null);
      window.dispatchEvent(evt);
    }
  },

  show: function ut_show(dy) {
    var alreadyShown = this.shown,
        trayStyle = this.overlay.style,
        firstShownStyle = this.firstShown.style;

    trayStyle.MozTransition = '-moz-transform 0.2s linear';
    trayStyle.MozTransform = 'translateY(100%)';

    firstShownStyle.MozTransition = '-moz-transform 0.2s linear';
    firstShownStyle.MozTransform = 'translateY(0px)';

    this.shown = true;
    this.screen.classList.add('utility-tray');

    if (!alreadyShown) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('utilitytrayshow', true, true, null);
      window.dispatchEvent(evt);
    }
  }
};

UtilityTray.init();
