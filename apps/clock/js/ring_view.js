define(function(require) {
'use strict';

var Utils = require('utils');
var mozL10n = require('l10n');
var AudioManager = require('audio_manager');
var PostMessageProxy = require('./panels/alarm/post_message_proxy');
var ChildWindowManager = require('./panels/alarm/child_window_manager');

/**
 * RingView displays the alert screen when a timer or alarm fires.
 * This screen may receive multiple different alarm/timer events;
 * ideally it would display all events that fire, but currently it
 * only shows the most recent event.
 */
function RingView() {
  this.alerts = [];
  this.ringtonePlayer = AudioManager.createAudioPlayer({
    interruptHandler: this
  });

  this.snoozeButton.addEventListener('click', this.onClickSnooze.bind(this));
  this.closeButton.addEventListener('click', this.onClickClose.bind(this));
  window.addEventListener('beforeunload', this.onBeforeUnload.bind(this));

  this.activeAlarm = PostMessageProxy.create(window.opener, 'activeAlarm');

  PostMessageProxy.receive('ringView', this);

  if (window.opener) {
    mozL10n.once(() => {
      ChildWindowManager.fireReady();
    });
  }
}

// The time, in milliseconds, to keep the screen awake while showing
// an alarm. After this time, the screen shuts off and the alarm
// silences itself.
const WAKE_DURATION = 600000;

RingView.prototype = {

  /**
   * Fire the notification for an alarm or timer.
   *
   * Presently, we only display one notification at a time, and the
   * _most recent_ one at that. Each notification gets its own wake
   * lock, ensuring that the screen will remain on for WAKE_DURATION.
   *
   * @param {string} alert.type 'alarm' or 'timer'
   * @param {string} alert.label Label to display (optional).
   * @param {string} alert.sound Filename of a sound to play (optional).
   * @param {boolean} alert.vibrate True if the alert should vibrate.
   */
  addAlert: function(alert) {
    // If we previously had an alert visible, this one is
    // going to override it, as though the previous alert was
    // dismissed.
    if (this.alerts.length) {
      var oldAlert = this.alerts.shift();
      oldAlert.releaseScreenWakeLock();
    }

    alert.releaseScreenWakeLock = function() { };

    // Insert this alert at the front of the stack, so that it
    // overrides any previous alert that was being displayed.
    this.alerts.unshift(alert);

    this.refreshDisplay();

    // Acquire a CPU wake lock so that we don't fall asleep waiting
    // for the document to become visible. We'll only try to hold a
    // lock for a few seconds as we wait for the document to become
    // visible, out of an abundance of caution.
    Utils.safeWakeLock({ type: 'cpu', timeoutMs: 5000 }, (releaseCpu) => {
      // When the document is visible, acquire a screen wake lock so
      // that we can safely display the alert.
      this.whenVisible(() => {
          Utils.safeWakeLock({ type: 'screen', timeoutMs: WAKE_DURATION },
                             (releaseScreenWakeLock) => {
            // Once we have acquired the screen wake lock, we can
            // release the CPU lock.
            releaseCpu();

            // Save off the screen wake lock for when we dismiss the
            // alert; all alarms each have their own screen wake lock.
            alert.releaseScreenWakeLock = releaseScreenWakeLock;
        });
      });
    });
  },

  /**
   * Update the display to show the currently active alert. If there
   * are a stack of alerts pending, only the most recent alert is
   * shown, as added to this.alerts by this.addAlert().
   */
  refreshDisplay: function() {
    // First, silence any existing sound or vibration. If a previous
    // alarm was going off, this alarm may have different settings.
    // The new alarm will replace any prior settings.
    this.silence();

    var alert = this.alerts[0];

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

    // If the window has been hidden, show the window.
    if (document.hidden) {
      window.focus();
    }
  },

  /**
   * Stop all sounds and vibration immediately.
   */
  silence: function() {
    // Stop the alert sound, if one was playin'.
    this.ringtonePlayer.pause();

    // Stop vibrating, if we were shakin'.
    clearInterval(this.vibrateInterval);
    this.vibrateInterval = null;
  },

  /**
   * Handle an interrupt as reported from the Audio player. This could
   * happen if an incoming call arrives while the alert is ringing. We
   * should silence our alarm to allow the phone call to take
   * precedence.
   */
  onInterrupt: function(evt) {
    this.silence();
  },

  /**
   * Clean up any state when we close this alert window. This includes
   * silencing the alarm and releasing any locks we have acquired.
   */
  onBeforeUnload: function(evt) {
    // Clean up any wake locks we still have.
    while (this.alerts.length) {
      var alert = this.alerts.shift();
      alert.releaseScreenWakeLock();
    }
    this.silence();
  },

  /**
   * Snooze the current alarm. (The snooze button is only visible for
   * alarms, not timers. Alarms have an ID; timers do not.)
   */
  onClickSnooze: function(evt) {
    var alert = this.alerts[0];
    this.activeAlarm.snoozeAlarm(alert.id);
    window.close();
  },

  /**
   * Close this window, notifying ActiveAlarm, which will pop the user
   * back to the appropriate location if they are still using the
   * Clock app.
   */
  onClickClose: function(evt) {
    var alert = this.alerts[0];
    this.activeAlarm.close(alert.type, alert.id);
    window.close();
  },

  /**
   * Call the callback when `document.hidden` is false. Due to a bug
   * in the B2G Browser API <https://bugzil.la/810431>, the window may
   * not be immediately visible, particularly if the screen is off.
   * The recommended workaround for that bug was to use setTimeout. If
   * the page is still hidden after that, we listen for
   * `visibilitychange`. When that bug has some action, we should
   * revisit how much of this method is needed.
   */
  whenVisible: function(cb) {
    if (!document.hidden) {
      cb();
    } else {
      setTimeout(() => {
        if (!document.hidden) {
          cb();
        } else {
          var listener = function(e) {
            if (!document.hidden) {
              document.removeEventListener('visibilitychange', listener);
              cb();
            }
          };
          document.addEventListener('visibilitychange', listener);
        }
      });
    }
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
