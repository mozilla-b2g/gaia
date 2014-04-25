define(function(require) {
'use strict';

var Utils = require('utils');
var mozL10n = require('l10n');
var AudioPlayer = require('audio_player');
var PostMessageProxy = require('./panels/alarm/post_message_proxy');
var ChildWindowManager = require('./panels/alarm/child_window_manager');
var VolumeInterceptor = require('./volume_interceptor');

const SCREEN_ON_DURATION = 1000 * 60 * 1;
const AUDIBLE_DURATION = 1000 * 60 * 15;

/**
 * RingView displays the alert screen when a timer or alarm fires.
 * This screen may receive multiple different alarm/timer events;
 * ideally it would display all events that fire, but currently it
 * only shows the most recent event.
 *
 * The expected behavior of RingView is as follows:
 *
 * - If the user does nothing for 1 minute (SCREEN_ON_DURATION), the
 *   screen falls asleep but the timer/alarm keep ringing.
 *
 * - If the user does nothing for 15 minutes (AUDIBLE_DURATION), or a
 *   call comes in, the timer and alarm silence themselves, but they
 *   still will show up when the user looks at the phone again.
 *
 * - If the user presses home or sleep, the alarm goes into "snooze"
 *   mode, or the timer closes.
 *
 * - If the user presses the volume button, all sounds stop, and if
 *   it's an alarm, the alarm goes into "snooze" mode.
 */
function RingView() {
  this.alerts = [];
  this.ringtonePlayer = new AudioPlayer();
  this.activeAlarm = PostMessageProxy.create(window.opener, 'activeAlarm');
  this.volumeInterceptor = new VolumeInterceptor(
    () => this.dismissViaAction('volume'));
  this.visibilityChangeReason = null;

  this.unbindListeners = Utils.bindListeners([
    [this.snoozeButton, 'click', this.snooze],
    [this.closeButton, 'click', this.close],
    [document, 'visibilitychange', this.onVisibilityChange],
    [window, 'resize', this.onResize],
    [window, 'test-interrupt', this.fakeInterrupt],
    [this.ringtonePlayer.audio, 'mozinterruptbegin',
     () => this.dismissViaAction('interrupt')]
  ], this);

  PostMessageProxy.receive('ringView', this);

  if (window.opener) {
    mozL10n.ready(ChildWindowManager.fireReady);
  }
}

RingView.prototype = {

  /** Return the current alert. */
  get alert() {
    return this.alerts[0];
  },

  /**
   * Fire the notification for an alarm or timer.
   *
   * Presently, we only display one notification at a time, and the
   * _most recent_ one at that. Each notification gets its own wake
   * lock, ensuring that the screen will remain on for SCREEN_ON_DURATION.
   *
   * @param {string} alert.type 'alarm' or 'timer'
   * @param {string} alert.label Label to display (optional).
   * @param {string} alert.sound Filename of a sound to play (optional).
   * @param {boolean} alert.vibrate True if the alert should vibrate.
   */
  addAlert: function(alert) {
    var testOpts = alert.testOpts || {};
    // If we previously had an alert visible, this one is
    // going to override it, as though the previous alert was
    // dismissed. A future enhancement will show multiple alerts at once.
    if (this.alerts.length) {
      this.removeCurrentAlert();
    }

    // Insert this alert at the front of the stack, so that it
    // overrides any previous alert that was being displayed.
    this.alerts.unshift(alert);

    // Acquire or extend a lock to keep the screen on.
    this._screenLock = this._screenLock || navigator.requestWakeLock('screen');
    clearTimeout(this._screenTimeout);
    this._screenTimeout = setTimeout(() => {
      console.log('Releasing screen lock.');
      this._screenLock.unlock();
      this._screenLock = null;
    }, testOpts.screenOnDuration || SCREEN_ON_DURATION);

    // Acquire or extend a lock to keep the CPU on. Silence the alarm afterward.
    this._cpuLock = this._cpuLock || navigator.requestWakeLock('cpu');
    clearTimeout(this._cpuTimeout);
    this._cpuTimeout = setTimeout(() => {
      console.log('Releasing CPU lock and silencing alarm.');
      this._cpuLock.unlock();
      this._cpuLock = null;
      this.silence();
    }, testOpts.audibleDuration || AUDIBLE_DURATION);

    // Silence any existing sound or vibration. If a previous alarm
    // was going off, this alarm may have different settings. The new
    // alarm will replace any prior settings.
    this.silence();

    // Set the label (blank or falsey becomes a default string).
    this.ringLabel.textContent = alert.label ||
      mozL10n.get(alert.type === 'alarm' ? 'alarm' : 'timer');

    // Display the proper screen widgets.
    this.ringDisplay.dataset.ringType = alert.type;

    // Set the time to display.
    this.time.innerHTML = Utils.getLocalizedTimeHtml(alert.time);

    if (alert.sound) {
      this.ringtonePlayer.playRingtone(alert.sound);
    }

    // Vibrate if we want to shakey shakey.
    if (alert.vibrate && ('vibrate' in navigator)) {
      clearInterval(this.vibrateInterval);
      var vibrateOnce = function() {
        navigator.vibrate([1000]);
      };
      this.vibrateInterval = setInterval(vibrateOnce, 2000);
      vibrateOnce();
    }

    document.documentElement.classList.add('ready');
    window.focus();
  },

  /**
   * Stop all sounds and vibration immediately.
   */
  silence: function() {
    this.ringtonePlayer.pause();
    clearInterval(this.vibrateInterval);
    this.vibrateInterval = null;
    this.ringDisplay.classList.add('silenced');
  },

  /**
   * Handle visibility state change.
   */
  onVisibilityChange: function(evt) {
    if (document.hidden) {
      // This event might be fired _after_ we see something like
      // mozinterruptbegin, in which case we should ignore this event.
      if (this.visibilityChangeReason) {
        return;
      }
      // If the phone's screen turns off before our wake lock expires,
      // we know that the user tapped the power button. We can assume
      // that the user saw the alert and took action.
      if (this._screenLock) {
        this.dismissViaAction('power');
      } else {
        // The phone's screen turned off without the user doing
        // anything. We want the alert to keep ringing until the phone
        // completely suspends, which will ONLY happen when we release
        // our CPU lock -- so we don't need to do anything here.
      }
    } else {
      // If we were previously interrupted and came back, it's as
      // though we never left.
      this.visibilityChangeReason = null;
    }
  },

  onResize: function(evt) {
    // We have to figure out if the attention screen has been
    // minimized; right now the only way to do this is by guessing the
    // window's proportions. 0.2 is just a guess as to what would
    // indicate that we're minimized.
    var didMinimize = (window.innerHeight / window.innerWidth) < 0.2;
    if (didMinimize) {
      // If we're getting minimized in response to some other
      // intterupt, ignore this resize event.
      if (!this.visibilityChangeReason) {
        this.dismissViaAction('home');
      }
    } else {
      this.visibilityChangeReason = null;
    }
  },

  /**
   * Dismiss the current alert based upon an action other than the
   * user pressing the close or snooze button. For instance, 'timer'
   * and 'alarm' alerts require different actions depending on which
   * hardware button was pressed.
   */
  dismissViaAction: function(reason) {
    this.visibilityChangeReason = reason;
    console.log('Dismissing alarm (' + reason + ').');
    var type = this.alert.type;
    switch(reason) {
    case 'power':
    case 'home':
      if (type === 'alarm') {
        this.snooze();
      } else if (type === 'timer') {
        this.close();
      }
      break;
    case 'volume':
      if (type === 'alarm') {
        this.snooze();
      } else if (type === 'timer') {
        this.silence();
      }
      break;
    case 'interrupt':
      this.silence();
      break;
    }
  },

  /**
   * Snooze the current alarm. (The snooze button is only visible for
   * alarms, not timers. Alarms have an ID; timers do not.)
   */
  snooze: function() {
    this.silence();
    this.unbindListeners();
    this.activeAlarm.snoozeAlarm(this.alert.id);
    window.close();
  },

  /**
   * Close this window, notifying ActiveAlarm, which will pop the user
   * back to the appropriate location if they are still using the
   * Clock app.
   */
  close: function() {
    this.silence();
    this.unbindListeners();
    this.activeAlarm.close(this.alert.type, this.alert.id);
    window.close();
  },


  /**
   * For the benefit of integration tests, generate a fake
   * "mozinterruptbegin" event on the Audio player.
   */
  fakeInterrupt: function() {
    this.ringtonePlayer.audio.dispatchEvent(
      new CustomEvent('mozinterruptbegin'));
  }
};

Utils.extendWithDomGetters(RingView.prototype, {
  time: '#ring-clock-time',
  ringLabel: '#ring-label',
  snoozeButton: '#ring-button-snooze',
  closeButton: '#ring-button-stop',
  ringDisplay: '.ring-display'
});

return RingView;

});
