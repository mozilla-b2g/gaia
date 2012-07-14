/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SoundManager = {
  /*
  * return the current volume
  * Must not mutate directly - use changeVolume.
  * Listen to 'volumechange' event to properly handle status changes
  */
  currentVolume: 5,

  init: function soundManager_init() {
    window.addEventListener('volumeup', this);
    window.addEventListener('volumedown', this);
  },

  handleEvent: function soundManager_handleEvent(evt) {
    if (!ScreenManager.screenEnabled)
      return;

    switch (evt.type) {
      case 'volumeup':
        this.changeVolume(1);
        break;
      case 'volumedown':
        this.changeVolume(-1);
        break;
    }
  },

  changeVolume: function soundManager_changeVolume(delta) {
    var volume = this.currentVolume + delta;
    this.currentVolume = volume = Math.max(0, Math.min(10, volume));

    var notification = document.getElementById('volume');
    var classes = notification.classList;
    if (volume == 0) {
      classes.add('vibration');
    } else {
      classes.remove('vibration');
    }

    var steps = notification.children;
    for (var i = 0; i < steps.length; i++) {
      var step = steps[i];
      if (i < volume)
        step.classList.add('active');
      else
        step.classList.remove('active');
    }

    classes.add('visible');
    if (this._timeout)
      window.clearTimeout(this._timeout);

    this._timeout = window.setTimeout(function hideSound() {
      classes.remove('visible');
    }, 1500);

    this.fireVolumeChangeEvent();
  },

  fireVolumeChangeEvent: function soundManager_fireVolumeChangeEvent() {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('volumechange',
      /* canBubble */ true, /* cancelable */ false,
      {currentVolume: this.currentVolume});
    window.dispatchEvent(evt);
  }
};
