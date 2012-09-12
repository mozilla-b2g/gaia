/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var BatteryManager = {
  getAllElements: function bm_getAllElements() {
    this.screen = document.getElementById('screen');
    this.overlay = document.getElementById('system-overlay');
    this.notification = document.getElementById('battery');
  },

  init: function bm_init() {
    this.getAllElements();
    var battery = window.navigator.battery;
    if (battery) {
      battery.addEventListener('chargingchange', this);
      battery.addEventListener('levelchange', this);
    }

    // XXX: listen to settings 'powersaving.enable' and
    // 'powersaving.threshold' to toggle power saving mode
  },

  handleEvent: function bm_handleEvent(evt) {
    var battery = window.navigator.battery;
    if (!battery)
      return;

    switch (evt.type) {
      case 'chargingchange':
        this.notification.dataset.charging = battery.charging;
        this.notification.dataset.level = null;
      case 'levelchange':
        this.notification.dataset.charging = null;
        this.notification.dataset.level = Math.floor(battery.level * 10) * 10;
        break;
    }
    
    this.display();
  },

  display: function bm_display() {
    var self = this;
    var overlayClass = this.overlay.classList;
    var notificationClass = this.notification.classList;
    overlayClass.add('battery');
    notificationClass.add('visible');
    window.setTimeout(function hideBattery() {
      overlayClass.remove('battery');
      notificationClass.remove('visible');
    }, 1500);
  }
};

BatteryManager.init();
