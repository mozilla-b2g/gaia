/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
'use strict';

var RingView = {

  _ringtonePlayer: null,
  _vibrateInterval: null,
  _screenLock: null,

  get time() {
    delete this.time;
    return this.time = document.getElementById('ring-clock-time');
  },

  get hourState() {
    delete this.hourState;
    return this.hourState = document.getElementById('ring-clock-hour24-state');
  },

  get alarmLabel() {
    delete this.alarmLabel;
    return this.alarmLabel = document.getElementById('ring-alarm-label');
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
    document.addEventListener('mozvisibilitychange', this);
    if (!document.mozHidden) {
      this.startAlarmNotification();
    } else {
      // The setTimeout() is used to workaround
      // https://bugzilla.mozilla.org/show_bug.cgi?id=810431
      // The workaround is used in screen off mode.
      // mozHidden will be true in init() state.
      var self = this;
      window.setTimeout(function rv_checkMozHidden() {
        // If mozHidden is true in init state,
        // it means that the incoming call happens before the alarm.
        // We should just put a "silent" alarm screen
        // underneath the oncall screen
        if (!document.mozHidden) {
          self.startAlarmNotification();
        }
      }, 0);
    }

    this.setAlarmTime();
    this.setAlarmLabel();
    this.snoozeButton.addEventListener('click', this);
    this.closeButton.addEventListener('click', this);
  },

  setWakeLockEnabled: function rv_setWakeLockEnabled(enabled) {
    // Don't let the phone go to sleep while the alarm goes off.
    // User must manually close it until 15 minutes.
    if (!navigator.requestWakeLock) {
      console.warn('WakeLock API is not available.');
      return;
    }

    if (enabled) {
      this._screenLock = navigator.requestWakeLock('screen');
    } else if (this._screenLock) {
      this._screenLock.unlock();
      this._screenLock = null;
    }
  },

  setAlarmTime: function rv_setAlarmTime() {
    var alarmTime = window.opener.AlarmManager.getAlarmTime();
    var time = getLocaleTime(alarmTime);
    this.time.textContent = time.t;
    this.hourState.textContent = time.p;
  },

  setAlarmLabel: function rv_setAlarmLabel() {
    this.alarmLabel.textContent = window.opener.AlarmManager.getAlarmLabel();
  },

  ring: function rv_ring() {
    this._ringtonePlayer = new Audio();
    var ringtonePlayer = this._ringtonePlayer;
    ringtonePlayer.addEventListener('mozinterruptbegin', this);
    ringtonePlayer.mozAudioChannelType = 'alarm';
    ringtonePlayer.loop = true;
    var selectedAlarmSound = 'shared/resources/media/alarms/' +
                             window.opener.AlarmManager.getAlarmSound();
    ringtonePlayer.src = selectedAlarmSound;
    ringtonePlayer.play();
    /* If user don't handle the onFire alarm,
       pause the ringtone after 15 minutes */
    var self = this;
    var duration = 60000 * 15;
    window.setTimeout(function rv_pauseRingtone() {
      self.stopAlarmNotification('ring');
    }, duration);
  },

  vibrate: function rv_vibrate() {
    if ('vibrate' in navigator) {
      this._vibrateInterval = window.setInterval(function vibrate() {
        navigator.vibrate([1000]);
      }, 2000);
      /* If user don't handle the onFire alarm,
       turn off vibration after 15 minutes */
      var self = this;
      var duration = 60000 * 15;
      window.setTimeout(function rv_clearVibration() {
        self.stopAlarmNotification('vibrate');
      }, duration);
    }
  },

  startAlarmNotification: function rv_startAlarmNotification() {
    this.setWakeLockEnabled(true);
    this.ring();
    this.vibrate();
  },

  stopAlarmNotification: function rv_stopAlarmNotification(action) {
    switch (action) {
    case 'ring':
      if (this._ringtonePlayer)
        this._ringtonePlayer.pause();

      break;
    case 'vibrate':
      if (this._vibrateInterval)
        window.clearInterval(this._vibrateInterval);

      break;
    default:
      if (this._ringtonePlayer)
        this._ringtonePlayer.pause();

      if (this._vibrateInterval)
        window.clearInterval(this._vibrateInterval);

      break;
    }
    this.setWakeLockEnabled(false);
  },

  handleEvent: function rv_handleEvent(evt) {
    switch (evt.type) {
    case 'mozvisibilitychange':
      // https://bugzilla.mozilla.org/show_bug.cgi?id=810431
      // Since Bug 810431 is not fixed yet,
      // be carefull to use the event here during alarm goes off.
      break;
    case 'mozinterruptbegin':
      // Only ringer/telephony channel audio could trigger 'mozinterruptbegin'
      // event on the 'alarm' channel audio element.
      // If the incoming call happens after the alarm rings,
      // we need to close ourselves.
      window.opener.AlarmManager.cancelHandler();
      window.close();
      break;
    case 'click':
      var input = evt.target;
      if (!input)
        return;

      switch (input.id) {
      case 'ring-button-snooze':
        this.stopAlarmNotification();
        window.opener.AlarmManager.snoozeHandler();
        window.close();
        break;
      case 'ring-button-close':
        this.stopAlarmNotification();
        window.opener.AlarmManager.cancelHandler();
        window.close();
        break;
      }
      break;
    }
  }

};

RingView.init();

