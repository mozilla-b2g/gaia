/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var SoundManager = {
  /*
  * return the current volume
  * Must not multate directly - use changeVolume.
  * Listen to 'volumechange' event to properly handle status changes
  */
  currentVolume: 25,
  level: 5,

  /*
  * Starting repeating the key press after the key is being hold down
  * for kKeyRepeatTimeout ms. 0 to disable.
  * XXX: Disable to prevent out of sync with actual volume change in Gecko.
  *
  */
  kKeyRepeatTimeout: 0, // was 700

  /*
  * Interval of each repeat
  */
  kKeyRepeatRate: 100,

  init: function soundManager_init() {
    window.addEventListener('keydown', this);
    window.addEventListener('keyup', this);

    var self = this;
    SettingsListener.observe('audio.volume.master', this.currentVolume,
      function soundManager_observe(value) {
        self.currentVolume = value * 100;
        self.level = Math.sqrt(self.currentVolume);
    });
  },

  handleEvent: function soundManager_handleEvent(evt) {
    if (!ScreenManager.screenEnabled)
      return;

    switch (evt.type) {
      case 'keydown':
        switch (evt.keyCode) {
          case evt.DOM_VK_PAGE_UP:
            this.repeatKey((function repeatKeyCallback() {
              if (this.level == 10) {
                clearTimeout(this._timer);
                return;
              }
              this.changeVolume(1);
            }).bind(this));
            break;

          case evt.DOM_VK_PAGE_DOWN:
            this.repeatKey((function repeatKeyCallback() {
              if (this.level == 0) {
                clearTimeout(this._timer);
                return;
              }
              this.changeVolume(-1);
            }).bind(this));
            break;
        }
        break;

      case 'keyup':
        if (evt.keyCode !== evt.DOM_VK_PAGE_UP &&
            evt.keyCode !== evt.DOM_VK_PAGE_DOWN)
          return;

        clearTimeout(this._timer);
        break;
    }
  },

  repeatKey: function soundManager_repeatKey(callback) {
    callback();
    clearTimeout(this._timer);

    if (!this.kKeyRepeatTimeout)
      return;

    this._timer = window.setTimeout((function volumeTimeout() {
      callback();
      this._timer = setInterval(function volumeInterval() {
        callback();
      }, this.kKeyRepeatRate);
    }).bind(this), this.kKeyRepeatTimeout);
  },

  changeVolume: function soundManager_changeVolume(delta) {
    var volume = this.level + delta;
    this.level = volume = Math.max(0, Math.min(10, volume));
    this.currentVolume = Math.pow(this.level, 2);

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

    var settings = navigator.mozSettings;
    if (settings) {
      settings.getLock().set({'audio.volume.master': this.currentVolume / 10});
    }

    this.fireVolumeChangeEvent();
  },

  fireVolumeChangeEvent: function soundManager_fireVolumeChangeEvent() {
    var evt = document.createEvent('CustomEvent');
    evt.initCustomEvent('volumechange',
      /* canBubble */ true, /* cancelable */ false,
      {currentVolume: this.currentVolume / 100});
    window.dispatchEvent(evt);
  }
};
