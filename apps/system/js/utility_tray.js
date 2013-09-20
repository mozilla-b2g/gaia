/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var UtilityTray = {
  shown: false,

  active: false,

  overlay: document.getElementById('utility-tray'),

  statusbar: document.getElementById('statusbar'),

  screen: document.getElementById('screen'),

  init: function ut_init() {
    var touchEvents = ['touchstart', 'touchmove', 'touchend'];
    touchEvents.forEach(function bindEvents(name) {
      window.addEventListener(name, this);
    }, this);

    window.addEventListener('screenchange', this);
    window.addEventListener('emergencyalert', this);
    window.addEventListener('home', this);
    window.addEventListener('attentionscreenshow', this);
    window.addEventListener('displayapp', this);

    // Firing when the keyboard and the IME switcher shows/hides.
    window.addEventListener('keyboardimeswitchershow', this);
    window.addEventListener('keyboardimeswitcherhide', this);

    // Firing when user selected a new keyboard or canceled it.
    window.addEventListener('keyboardchanged', this);
    window.addEventListener('keyboardchangecanceled', this);

    this.overlay.addEventListener('transitionend', this);
  },

  handleEvent: function ut_handleEvent(evt) {
    switch (evt.type) {
      case 'attentionscreenshow':
      case 'home':
      case 'emergencyalert':
      case 'displayapp':
      case 'keyboardchanged':
      case 'keyboardchangecanceled':
        if (this.shown) {
          this.hide();
        }
        break;

      // When IME switcher shows, prevent the keyboard's focus getting changed.
      case 'keyboardimeswitchershow':
        this.overlay.addEventListener('mousedown', this._pdIMESwitcherShow);
        this.statusbar.addEventListener('mousedown', this._pdIMESwitcherShow);
        break;

      case 'keyboardimeswitcherhide':
        this.overlay.removeEventListener('mousedown', this._pdIMESwitcherShow);
        this.statusbar.removeEventListener('mousedown',
                                           this._pdIMESwitcherShow);
        break;


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

        this.onTouchEnd(evt.changedTouches[0]);
        break;

      case 'transitionend':
        if (!this.shown)
          this.screen.classList.remove('utility-tray');
        break;
    }
  },

  onTouchStart: function ut_onTouchStart(touch) {
    this.startY = touch.pageY;

    this.screen.classList.add('utility-tray');
    this.onTouchMove({ pageY: touch.pageY + this.statusbar.offsetHeight });
  },

  onTouchMove: function ut_onTouchMove(touch) {
    var screenHeight = this.overlay.getBoundingClientRect().height;
    var y = touch.pageY;
    if (y > this.lastY)
      this.opening = true;
    else if (y < this.lastY)
      this.opening = false;
    this.lastY = y;
    var dy = -(this.startY - y);
    if (this.shown)
      dy += screenHeight;
    dy = Math.min(screenHeight, dy);

    var style = this.overlay.style;
    style.MozTransition = '';
    style.MozTransform = 'translateY(' + dy + 'px)';
  },

  onTouchEnd: function ut_onTouchEnd(touch) {
    this.opening ? this.show() : this.hide();
  },

  hide: function ut_hide(instant) {
    var alreadyHidden = !this.shown;
    var style = this.overlay.style;
    style.MozTransition = instant ? '' : '-moz-transform 0.2s linear';
    style.MozTransform = 'translateY(0)';
    this.shown = false;
    this.lastY = undefined;
    this.startY = undefined;

    // If the transition has not started yet there won't be any transitionend
    // event so let's not wait in order to remove the utility-tray class.
    if (instant || style.MozTransform == 'translateY(0px)') {
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
