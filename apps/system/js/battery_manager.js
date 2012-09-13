/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var BatteryManager = {
  TOASTER_TIMEOUT: 5000,

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
    this._toasterGD = new GestureDetector(this.toaster);
    ['tap', 'mousedown', 'swipe'].forEach(function(evt) {
      this.notification.addEventListener(evt, this);
    }, this);


    // XXX: listen to settings 'powersaving.enable' and
    // 'powersaving.threshold' to toggle power saving mode
  },

  handleEvent: function bm_handleEvent(evt) {
    switch (evt.type) {
      case 'levelchange':
        var battery = window.navigator.battery;
        if (!battery)
          return;

        var level = Math.floor(battery.level * 10) * 10;
        this.notification.dataset.level = level;
        if (level == 10 || level == 30 || level == 100)
          this.display();
        break;

      case 'tap':
        var target = evt.target;
        this.tap(target);
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
    var self = this;
    var overlayClass = this.overlay.classList;
    var notificationClass = this.notification.classList;
  
    overlayClass.add('battery');
    notificationClass.add('visible');
    //this._toasterGD.startDetecting();

    if (this._toasterTimeout)
      clearTimeout(this._toasterTimeout);

    this._toasterTimeout = setTimeout((function() {
      console.log('-----=====');
      overlayClass.remove('battery');
      notificationClass.remove('visible');
      this._toasterTimeout = null;
      //this._toasterGD.stopDetecting();
    }).bind(this), this.TOASTER_TIMEOUT);
  },

  hide: function bm_hide() {
    this.overlay.classList.remove('battery');
    this.notification.classList.remove('visible');
  },

  // Swipe handling
  mousedown: function ns_mousedown(evt) {
    evt.preventDefault();
    this._notification = evt.target;
    this._containerWidth = this.container.clientWidth;

    this._notification.style.MozTransition = '';
    this._notification.style.width = evt.target.parentNode.clientWidth + 'px';
  },

  swipe: function ns_swipe(evt) {
    var detail = evt.detail;
    var distance = detail.start.screenX - detail.end.screenX;
    var fastEnough = Math.abs(detail.vx) > this.TRANSITION_SPEED;
    var farEnough = Math.abs(distance) >
      this._containerWidth * this.TRANSITION_FRACTION;

    if (!(farEnough || fastEnough)) {
      // Werent far or fast enough to delete, restore
      delete this._notification;
      return;
    }

    this._notification.classList.add('disappearing');

    var notification = this._notification;
    this._notification = null;

    var toaster = this.overlay;
    var self = this;
    notification.addEventListener('transitionend', function trListener() {
      notification.removeEventListener('transitionend', trListener);

      self.closeNotification(notification);

      if (notification != toaster)
        return;

      // Putting back the toaster in a clean state for the next notification
      toaster.style.display = 'none';
      setTimeout(function nextLoop() {
        toaster.style.MozTransition = '';
        toaster.style.MozTransform = '';
        toaster.classList.remove('displayed');

        setTimeout(function nextLoop() {
          toaster.style.display = 'block';
        });
      });
    });
  },

  tap: function ns_tap(notificationNode) {
    this.hide();
  }
};

BatteryManager.init();
