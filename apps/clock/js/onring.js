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

  init: function rv_init() {
    this.updateTime();
    this.onRing();
    this.onVibrate();
    document.addEventListener('mozvisibilitychange', this);
    document.getElementById('ring-btn-snooze').addEventListener('click', this);
    document.getElementById('ring-btn-close').addEventListener('click', this);
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

  onRing: function rv_onRing() {

    this._ringtonePlayer = new Audio();
    this._ringtonePlayer.loop = true;
    // XXX Need to set the ringtone according to alarm's property of 'sound'
    var selectedAlarmSound = 'style/ringtones/classic.wav';
    this._ringtonePlayer.src = selectedAlarmSound;
    this._ringtonePlayer.play();
    /* If user don't handle the onFire alarm,
       pause the ringtone after 20 secs */
    var self = this;
    window.setTimeout(function rv_pauseRingtone() {
      self._ringtonePlayer.pause();
    }, 20000);
  },

  onVibrate: function rv_onVibrate() {
    if ('vibrate' in navigator) {
      this._vibrateInterval = window.setInterval(function vibrate() {
        navigator.vibrate([200]);
      }, 600);
      /* If user don't handle the onFire alarm,
       turn off vibraction after 7 secs */
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
          case 'ring-btn-snooze':
            window.clearInterval(this._vibrateInterval);
            this._ringtonePlayer.pause();
            window.opener.AlarmManager.snoozeHandler();
            window.close();
            break;

          case 'ring-btn-close':
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
