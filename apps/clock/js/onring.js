/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var RingView = {

  _ringtonePlayer: null,
  _vibrateInterval: null,

  get time() {
    delete this.time;
    return this.time = document.getElementById('ring-clock-time');
  },

  get hourState() {
    delete this.hourState;
    return this.hourState = document.getElementById('ring-clock-hour24-state');
  },

  get snoozeButton() {
    delete this.snoozeButton;
    return this.snoozeButton = document.getElementById('ring-button-snooze');
  },

  get closeButton() {
    delete this.closeButton;
    return this.closeButton = document.getElementById('ring-button-close');
  },

  init: function rv_init() {
    this.updateTime();
    this.ring();
    this.vibrate();
    document.addEventListener('mozvisibilitychange', this);
    this.snoozeButton.addEventListener('click', this);
    this.closeButton.addEventListener('click', this);
  },

  updateTime: function rv_updateTime() {
    var d = new Date();

    // XXX: respect clock format in Settings
    var hour = d.getHours() % 12;
    if (!hour)
      hour = 12;
    this.time.textContent = hour + d.toLocaleFormat(':%M');
    this.hourState.textContent = d.toLocaleFormat('%p');

    var self = this;
    this._timeout = window.setTimeout(function cv_clockTimeout() {
      self.updateTime();
    }, (59 - d.getSeconds()) * 1000);
  },

  ring: function rv_ring() {
    this._ringtonePlayer = new Audio();
    var ringtonePlayer = this._ringtonePlayer;
    ringtonePlayer.loop = true;
    // XXX Need to set the ringtone according to alarm's property of 'sound'
    var selectedAlarmSound = 'style/ringtones/classic.wav';
    ringtonePlayer.src = selectedAlarmSound;
    ringtonePlayer.play();
    /* If user don't handle the onFire alarm,
       pause the ringtone after 20 secs */
    window.setTimeout(function rv_pauseRingtone() {
      ringtonePlayer.pause();
    }, 20000);
  },

  vibrate: function rv_vibrate() {
    if ('vibrate' in navigator) {
      this._vibrateInterval = window.setInterval(function vibrate() {
        navigator.vibrate([200]);
      }, 600);
      /* If user don't handle the onFire alarm,
       turn off vibration after 7 secs */
      var self = this;
      window.setTimeout(function rv_clearVibration() {
        window.clearInterval(self._vibrateInterval);
      }, 7000);
    }
  },

  handleEvent: function rv_handleEvent(evt) {
    switch (evt.type) {
      case 'mozvisibilitychange':
        if (document.mozHidden) {
          window.clearTimeout(this._timeout);
          return;
        }
        // Refresh the view when app return to foreground.
        this.updateTime();
        break;

      case 'click':
        var input = evt.target;
        if (!input)
          return;

        switch (input.id) {
          case 'ring-button-snooze':
            window.clearInterval(this._vibrateInterval);
            this._ringtonePlayer.pause();
            window.opener.AlarmManager.snoozeHandler();
            window.close();
            break;

          case 'ring-button-close':
            window.clearInterval(this._vibrateInterval);
            this._ringtonePlayer.pause();
            window.opener.AlarmManager.cancelHandler();
            window.close();
            break;
        }
        break;
    }
  }

};

RingView.init();
