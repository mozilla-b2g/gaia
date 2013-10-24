/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
define('onring', function(require) {
'use strict';

var Utils = require('utils');
var mozL10n = require('l10n');
var _ = mozL10n.get;

var RingView = {

  ringtonePlayer: null,
  vibrateInterval: null,
  screenLock: null,
  firedAlarm: {},
  message: {},
  started: false,

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
    var ActiveAlarm = window.opener.require('active_alarm');

    document.addEventListener('visibilitychange', this);

    this.firedAlarm = ActiveAlarm.firedAlarm;
    this.message = ActiveAlarm.message;
    if (!document.hidden) {
      this.startAlarmNotification();
    } else {
      // The setTimeout() is used to workaround
      // https://bugzilla.mozilla.org/show_bug.cgi?id=810431
      // The workaround is used in screen off mode.
      // hidden will be true in init() state.
      window.setTimeout(function rv_checkHidden() {
      // If hidden is true in init state,
      // it means that the incoming call happens before the alarm.
      // We should just put a "silent" alarm screen
      // underneath the oncall screen
        if (!document.hidden) {
          this.startAlarmNotification();
        }
        // Our final chance is to rely on visibilitychange event handler.
      }.bind(this), 0);
    }

    mozL10n.ready(function rv_waitLocalized() {
      this.setAlarmTime();
      this.setAlarmLabel();
    }.bind(this));

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
      this.screenLock = navigator.requestWakeLock('screen');
    } else if (this.screenLock) {
      this.screenLock.unlock();
      this.screenLock = null;
    }
  },

  setAlarmTime: function rv_setAlarmTime() {
    var alarmTime = this.getAlarmTime();
    var time = Utils.getLocaleTime(alarmTime);
    this.time.textContent = time.t;
    this.hourState.textContent = time.p;
  },

  setAlarmLabel: function rv_setAlarmLabel() {
    var label = this.getAlarmLabel();
    this.alarmLabel.textContent = (label === '') ? _('alarm') : label;
  },

  ring: function rv_ring() {
    var ringtonePlayer = this.ringtonePlayer = new Audio();
    ringtonePlayer.addEventListener('mozinterruptbegin', this);
    ringtonePlayer.mozAudioChannelType = 'alarm';
    ringtonePlayer.loop = true;
    var selectedAlarmSound = 'shared/resources/media/alarms/' +
                             this.getAlarmSound();
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
      this.vibrateInterval = window.setInterval(function vibrate() {
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
    // Ensure called only once.
    if (this.started)
      return;

    this.started = true;
    this.setWakeLockEnabled(true);
    if (this.firedAlarm.sound) {
      this.ring();
    }
    if (this.firedAlarm.vibrate == 1) {
      this.vibrate();
    }
  },

  stopAlarmNotification: function rv_stopAlarmNotification(action) {
    switch (action) {
    case 'ring':
      if (this.ringtonePlayer) {
        this.ringtonePlayer.pause();
      }
      break;
    case 'vibrate':
      if (this.vibrateInterval) {
        window.clearInterval(this.vibrateInterval);
      }
      break;
    default:
      if (this.ringtonePlayer) {
        this.ringtonePlayer.pause();
      }
      if (this.vibrateInterval) {
        window.clearInterval(this.vibrateInterval);
      }
      break;
    }
    this.setWakeLockEnabled(false);
  },

  getAlarmTime: function am_getAlarmTime() {
    var d = new Date();
    d.setHours(this.message.date.getHours());
    d.setMinutes(this.message.date.getMinutes());
    return d;
  },

  getAlarmLabel: function am_getAlarmLabel() {
    return this.firedAlarm.label;
  },

  getAlarmSound: function am_getAlarmSound() {
    return this.firedAlarm.sound;
  },

  handleEvent: function rv_handleEvent(evt) {
    switch (evt.type) {
    case 'visibilitychange':
      // There's chance to miss the hidden state when inited,
      // before setVisible take effects, there may be a latency.
      if (!document.hidden) {
        this.startAlarmNotification();
      }
      break;
    case 'mozinterruptbegin':
      // Only ringer/telephony channel audio could trigger 'mozinterruptbegin'
      // event on the 'alarm' channel audio element.
      // If the incoming call happens after the alarm rings,
      // we need to close ourselves.
      this.stopAlarmNotification();
      window.close();
      break;
    case 'click':
      var input = evt.target;
      if (!input)
        return;

      switch (input.id) {
      case 'ring-button-snooze':
        this.stopAlarmNotification();
        window.opener.require('active_alarm').snoozeHandler();
        window.close();
        break;
      case 'ring-button-close':
        this.stopAlarmNotification();
        window.close();
        break;
      }
      break;
    }
  }

};

RingView.init();
});

requirejs(['require_config'], function() {
  requirejs(['onring']);
});
