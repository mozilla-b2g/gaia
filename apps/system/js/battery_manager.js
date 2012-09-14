/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var BatteryManager = {
  TOASTER_TIMEOUT: 5000,
  TRANSITION_SPEED: 1.8,
  TRANSITION_FRACTION: 0.30,

  _notification: null,

  getAllElements: function bm_getAllElements() {
    this.screen = document.getElementById('screen');
    this.overlay = document.getElementById('system-overlay');
    this.notification = document.getElementById('battery');
  },

  init: function bm_init() {
    this.getAllElements();
    var battery = window.navigator.battery;
    if (battery) {
      battery.addEventListener('levelchange', this);
    }
    window.addEventListener('screenchange', this);
    this._toasterGD = new GestureDetector(this.notification);
    ['mousedown', 'swipe'].forEach(function(evt) {
      this.notification.addEventListener(evt, this);
    }, this);


    // XXX: listen to settings 'powersave.enable' and
    // 'powersave.threshold' to toggle power saving mode
  },

  handleEvent: function bm_handleEvent(evt) {
    switch (evt.type) {
      case 'screenchange':
        var battery = window.navigator.battery;
        if (!evt.detail.screenEnabled)
          battery.removeEventListener('levelchange', this);
        else
          battery.addEventListener('levelchange', this);
        break;

      case 'levelchange':
        var battery = window.navigator.battery;
        if (!battery)
          return;

        var level = Math.floor(battery.level * 10) * 10;
        this.notification.dataset.level = level;
        if (level == 10 || level == 30 || level == 100)
          this.display();
        break;

      case 'mousedown':
        this.mousedown(evt);
        break;
      case 'swipe':
        this.swipe(evt);
        break;
    }
  },

  display: function bm_display() {
    var overlayClass = this.overlay.classList;
    var notificationClass = this.notification.classList;

    overlayClass.add('battery');
    notificationClass.add('visible');
    this._toasterGD.startDetecting();

    if (this._toasterTimeout)
      clearTimeout(this._toasterTimeout);

    this._toasterTimeout = setTimeout((function() {
      overlayClass.remove('battery');
      notificationClass.remove('visible');
      this._toasterTimeout = null;
      this._toasterGD.stopDetecting();
    }).bind(this), this.TOASTER_TIMEOUT);
  },

  // Swipe handling
  mousedown: function bm_mousedown(evt) {
    evt.preventDefault();
    this._containerWidth = this.overlay.clientWidth;
  },

  swipe: function bm_swipe(evt) {
    var detail = evt.detail;
    var distance = detail.start.screenX - detail.end.screenX;
    var fastEnough = Math.abs(detail.vx) > this.TRANSITION_SPEED;
    var farEnough = Math.abs(distance) >
      this._containerWidth * this.TRANSITION_FRACTION;

    // If the swipe distance is too short or swipe speed is too slow,
    // do nothing.
    if (!(farEnough || fastEnough))
      return;

    var self = this;
    this.notification.addEventListener('animationend', function animationend() {
      self.notification.removeEventListener('animationend', animationend);
      self.notification.classList.remove('visible');
      self.notification.classList.remove('disappearing');
      self.overlay.classList.remove('battery');
    });
    this.notification.classList.add('disappearing');
  }
};

BatteryManager.init();
