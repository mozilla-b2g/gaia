/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var UtilityTray = {
  shown: false,

  active: false,

  overlay: document.getElementById('utility-tray'),

  statusbar: document.getElementById('statusbar'),

  grippy: document.getElementById('utility-tray-grippy'),

  screen: document.getElementById('screen'),

  init: function ut_init() {
    var touchEvents = ['touchstart', 'touchmove', 'touchend'];
    touchEvents.forEach(function bindEvents(name) {
      this.overlay.addEventListener(name, this);
      this.statusbar.addEventListener(name, this);
      this.grippy.addEventListener(name, this);
    }, this);

    window.addEventListener('screenchange', this);
    window.addEventListener('emergencyalert', this);
    window.addEventListener('home', this);
    window.addEventListener('attentionscreenshow', this);
    window.addEventListener('displayapp', this);
    window.addEventListener('appopening', this);

    // Firing when the keyboard and the IME switcher shows/hides.
    window.addEventListener('keyboardimeswitchershow', this);
    window.addEventListener('keyboardimeswitcherhide', this);

    window.addEventListener('simpinshow', this);

    // Firing when user selected a new keyboard or canceled it.
    window.addEventListener('keyboardchanged', this);
    window.addEventListener('keyboardchangecanceled', this);

    this.overlay.addEventListener('transitionend', this);

    if (window.navigator.mozMobileConnections) {
      LazyLoader.load('js/cost_control.js');
    }
  },

  startY: undefined,
  lastDelta: undefined,
  screenHeight: undefined,
  screenWidth: undefined,

  handleEvent: function ut_handleEvent(evt) {
    switch (evt.type) {
      case 'attentionscreenshow':
      case 'home':
      case 'emergencyalert':
      case 'displayapp':
      case 'keyboardchanged':
      case 'keyboardchangecanceled':
      case 'simpinshow':
      case 'appopening':
        if (this.shown) {
          this.hide();
        }
        break;

      // When IME switcher shows, prevent the keyboard's focus getting changed.
      case 'keyboardimeswitchershow':
        this.overlay.addEventListener('mousedown', this._pdIMESwitcherShow);
        break;

      case 'keyboardimeswitcherhide':
        this.overlay.removeEventListener('mousedown', this._pdIMESwitcherShow);
        break;

      case 'screenchange':
        if (this.shown && !evt.detail.screenEnabled)
          this.hide(true);
        break;

      case 'touchstart':
        if (LockScreen.locked)
          return;
        if (evt.target !== this.overlay &&
            evt.currentTarget !== this.statusbar &&
            evt.target !== this.grippy)
          return;

        this.onTouchStart(evt.touches[0]);
        break;

      case 'touchmove':
        this.onTouchMove(evt.touches[0]);
        break;

      case 'touchend':
        evt.stopImmediatePropagation();
        var touch = evt.changedTouches[0];
        if (Rocketbar.enabled && !this.shown && !this.active &&
            touch.pageX < this.screenWidth * Rocketbar.triggerWidth) {
          Rocketbar.render(true);
        }

        if (!this.active)
          return;

        this.active = false;

        this.onTouchEnd(touch);
        break;

      case 'transitionend':
        if (!this.shown)
          this.screen.classList.remove('utility-tray');
        break;
    }
  },

  onTouchStart: function ut_onTouchStart(touch) {
    var screenRect = this.overlay.getBoundingClientRect();
    this.screenHeight = screenRect.height;
    this.screenWidth = screenRect.width;

    // Show the rocketbar if it's enabled,
    // Give a slightly larger left area, than right.
    if (Rocketbar.enabled && !this.shown &&
        touch.pageX < this.screenWidth * Rocketbar.triggerWidth) {
      UtilityTray.hide();
      return;
    } else {
      window.dispatchEvent(new CustomEvent('taskmanagerhide'));
    }

    Rocketbar.hide();
    this.active = true;

    this.startY = touch.pageY;

    this.screen.classList.add('utility-tray');
  },

  onTouchMove: function ut_onTouchMove(touch) {
    if (!this.active) {
      return;
    }

    var screenHeight = this.screenHeight;

    var y = touch.pageY;

    var dy = -(this.startY - y);
    this.lastDelta = dy;

    if (this.shown) {
      dy += screenHeight;
    }
    dy = Math.min(screenHeight, dy);

    var style = this.overlay.style;
    style.MozTransition = '';
    style.MozTransform = 'translateY(' + dy + 'px)';
  },

  onTouchEnd: function ut_onTouchEnd(touch) {

    // Prevent utility tray shows while the screen got black out.
    if (LockScreen.locked) {
      this.hide(true);
    } else {
      var significant = (Math.abs(this.lastDelta) > (this.screenHeight / 5));
      var shouldOpen = significant ? !this.shown : this.shown;

      shouldOpen ? this.show() : this.hide();
    }
    this.startY = undefined;
    this.lastDelta = undefined;
    this.screenHeight = undefined;
  },

  hide: function ut_hide(instant) {
    var alreadyHidden = !this.shown;
    var style = this.overlay.style;
    style.MozTransition = instant ? '' : '-moz-transform 0.2s linear';
    style.MozTransform = '';
    this.shown = false;

    // If the transition has not started yet there won't be any transitionend
    // event so let's not wait in order to remove the utility-tray class.
    if (instant || style.MozTransform == '') {
      this.screen.classList.remove('utility-tray');
    }

    if (!alreadyHidden) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('utilitytrayhide', true, true, null);
      window.dispatchEvent(evt);
    }
  },

  show: function ut_show(dy) {
    var alreadyShown = this.shown;
    var style = this.overlay.style;
    style.MozTransition = '-moz-transform 0.2s linear';
    style.MozTransform = 'translateY(100%)';
    this.shown = true;
    this.screen.classList.add('utility-tray');

    if (!alreadyShown) {
      var evt = document.createEvent('CustomEvent');
      evt.initCustomEvent('utilitytrayshow', true, true, null);
      window.dispatchEvent(evt);
    }
  },

  _pdIMESwitcherShow: function ut_pdIMESwitcherShow(evt) {
      evt.preventDefault();
  }
};

UtilityTray.init();
