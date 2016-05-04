'use strict';

/* global SettingsListener, SettingsURL */
/* global Service, LazyLoader, toneUpgrader */
/* r=? dialer+system peers for changes in this file. */

(function(exports) {
  /**
   *
   * The delay between an incoming phone call and the first ring or vibration
   * needs to be as short as possible.
   *
   * This simple module keeps the ringtone (blob) around and starts alerting the
   * user as soon as a new incoming call is detected via the mozTelephony API.
   *
   * We also listen for the sleep and volumedown hardware buttons to provide
   * the user with an easy way to stop the ringing.
   *
   * @example
   * var dialerAgent = new DialerAgent();
   * dialerAgent.start(); // Attach the event listeners.
   * dialerAgent.stop();  // Deattach the event listeners.
   *
   * @class    DialerAgent
   * @requires SettingsListener
   * @requires SettingsURL
   * @requires Service
   * @requires LazyLoader
   *
   **/

  var DialerAgent = function DialerAgent() {
    var telephony = navigator.mozTelephony;
    if (!telephony) {
      return;
    }

    this._telephony = telephony;

    this._started = false;
    this._powerHangsUp = false;
    this._shouldVibrate = true;
    this._alerting = false;
    this._vibrateInterval = null;

    var player = new Audio();
    this._player = player;
    // XXX: This will need to be updated for bug 961967
    // (audio competing in system app)
    player.mozAudioChannelType = 'ringer';
    player.preload = 'metadata';
    player.loop = true;
  };

  DialerAgent.prototype.start = function da_start() {
    if (!this._telephony) {
      return;
    }

    if (this._started) {
      throw 'Instance should not be start()\'ed twice.';
    }
    this._started = true;

    SettingsListener.observe('audio.volume.notification', 7, function(value) {
      this._playRing();
    }.bind(this));

    SettingsListener.observe('dialer.ringtone', '', function(value) {
      LazyLoader.load(['../shared/js/settings_url.js']).then(function() {
        var phoneSoundURL = new SettingsURL();

        this._player.pause();
        this._player.src = phoneSoundURL.set(value);
        this._playRing();
      }.bind(this)).catch((err) => {
        console.error(err);
      });
    }.bind(this));

    // We have new default ringtones in 2.0, so check if the version is upgraded
    // then execute the necessary migration.
    if (Service.query('justUpgraded')) {
      LazyLoader.load('js/tone_upgrader.js').then(() => {
        toneUpgrader.perform('ringtone');
      });
    }

    SettingsListener.observe('dialer.power_hangsup', false, function(value) {
      this._powerHangsUp = !!value;
    }.bind(this));

    SettingsListener.observe('vibration.enabled', true, function(value) {
      this._shouldVibrate = !!value;
    }.bind(this));

    this._telephony.addEventListener('callschanged', this);

    window.addEventListener('sleep', this);
    window.addEventListener('wake', this);
    window.addEventListener('volumedown', this);

    Service.registerState('onCall', this);

    return this;
  };

  DialerAgent.prototype.stop = function da_stop() {
    if (!this._started) {
      return;
    }
    this._started = false;

    this._telephony.removeEventListener('callschanged', this);

    window.removeEventListener('sleep', this);
    window.removeEventListener('wake', this);
    window.removeEventListener('volumedown', this);

    Service.unregisterState('onCall', this);

    // TODO: should remove the settings listener once the helper
    // allows it.
    // See bug 981373.
  };

  DialerAgent.prototype.handleEvent = function da_handleEvent(evt) {
    if (evt.type === 'volumedown') {
      this._stopAlerting();
      return;
    }

    if ((evt.type === 'sleep') && this._alerting) {
      this._stopAlerting();
      return;
    }

    if ((evt.type === 'sleep') && this._powerHangsUp && this.onCall()) {
      // Hangup all calls
      this._telephony.calls.forEach(call => call.hangUp());

      if (this._telephony.conferenceGroup.calls.length > 0) {
        this._telephony.conferenceGroup.hangUp();
      }

      return;
    }

    if ((evt.type === 'wake') && this.onCall()) {
      Service.request('turnScreenOn');
      return;
    }

    if (evt.type !== 'callschanged') {
      return;
    }

    var calls = this._telephony.calls;
    if (calls.length === 0) {
      Service.request('turnScreenOn');
      return;
    }

    var calling = calls.some(function(call) {
      if (call.state === 'incoming' || call.state === 'dialing') {
        return true;
      }
    });

    if (calling) {
      // Show the callscreen window if it already exists.
      Service.request('AttentionWindowManager:showCallscreenWindow');
    }

    var incomingCall = calls[calls.length - 1];
    if (this._alerting || incomingCall.state !== 'incoming') {
      return;
    }

    var self = this;
    // Silence the ringtone if more than one call is present
    this._startAlerting(/* silent */ (this.numOpenLines() > 1));

    incomingCall.addEventListener('statechange', function callStateChange() {
      incomingCall.removeEventListener('statechange', callStateChange);

      self._stopAlerting();
    });
  };

  DialerAgent.prototype._playRing = function da_playRing() {
    // Notice that, even we are in the vibration mode, we would still play the
    // silence ringer. That is because when the incoming call is coming, other
    // playing sound should be paused. Therefore, we need to a silence ringer
    // to compete for the audio output.
    if (this._alerting) {
      this._player.play();
    }
  };

  DialerAgent.prototype._startAlerting = function da_startAlerting(silent) {
    this._alerting = true;

    if ('vibrate' in navigator && this._shouldVibrate) {
      this._vibrateInterval = window.setInterval(function vibrate() {
        navigator.vibrate([200]);
      }, 600);
      navigator.vibrate([200]);
    }

    this._player.volume = silent ? 0.0 : 1.0;
    this._playRing();
  };

  DialerAgent.prototype._stopAlerting = function da_stopAlerting() {
    var player = this._player;

    this._alerting = false;
    if (player && player.readyState > player.HAVE_NOTHING) {
      player.pause();
      player.currentTime = 0;
    }

    window.clearInterval(this._vibrateInterval);
  };

  DialerAgent.prototype.numOpenLines = function() {
    return this._telephony.calls.length +
      (this._telephony.conferenceGroup.calls.length ? 1 : 0);
  };

  DialerAgent.prototype.onCall = function() {
    return (this.numOpenLines() > 0);
  };

  exports.DialerAgent = DialerAgent;
}(window));
