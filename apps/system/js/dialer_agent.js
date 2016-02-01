'use strict';

/* global SettingsURL */
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
    this._prefsObservers = new Map();

    var player = new Audio();
    this._player = player;
    // XXX: This will need to be updated for bug 961967
    // (audio competing in system app)
    player.mozAudioChannelType = 'ringer';
    player.preload = 'metadata';
    player.loop = true;
  };

  /** Observer for the 'audio.volume.notification' pref. */
  DialerAgent.prototype._observeAudioVolumeNotification = function() {
    this._playRing();
  };

  /** Observer for the 'dialer.ringtone' pref. */
  DialerAgent.prototype._observeDialerRingtone = function(value) {
    LazyLoader.load(['shared/js/settings_url.js']).then(function() {
      var phoneSoundURL = new SettingsURL();

      this._player.pause();
      this._player.src = phoneSoundURL.set(value);
      this._playRing();
    }.bind(this)).catch((err) => {
      console.error(err);
    });
  };

  /** Observer for the 'dialer.power_hangsup' pref. */
  DialerAgent.prototype._observePowerHangsUp = function(value) {
    this._powerHangsUp = !!value;
  };

  /** Observer for the 'vibration.enabled' pref. */
  DialerAgent.prototype._observeVibrationEnabled = function(value) {
    this._shouldVibrate = !!value;
  };

  /**
   * Register the listeners for the various preferences we're interested in and
   * read the default values.
   *
   * @return {Promise} A promise that is resolved once all default preference
   *         values have been read
   */
  DialerAgent.prototype._registerPrefObservers = function() {
    this._prefsObservers.set(
      'audio.volume.notification',
      this._observeAudioVolumeNotification.bind(this)
    );
    this._prefsObservers.set('dialer.ringtone', function(evt) {
      this._observeDialerRingtone(evt.settingValue);
    }.bind(this));
    this._prefsObservers.set('dialer.power_hangsup', function(evt) {
      this._observePowerHangsUp(evt.settingValue);
    }.bind(this));
    this._prefsObservers.set('vibration.enabled', function(evt) {
      this._observeVibrationEnabled(evt.settingValue);
    }.bind(this));

    for (var [ key, value ] of this._prefsObservers.entries()) {
      navigator.mozSettings.addObserver(key, value);
    }

    var self = this;
    var lock = navigator.mozSettings.createLock();

    // Read the current ringtone value
    var ringtonePromise = new Promise(function(resolve, reject) {
      lock.get('dialer.ringtone').onsuccess = function() {
        self._observeDialerRingtone(this.result['dialer.ringtone']);
        resolve();
      };
    });

    // Read the current hang-up by power button status
    var powerPromise = new Promise(function(resolve, reject) {
      lock.get('dialer.power_hangsup').onsuccess = function() {
        self._observePowerHangsUp(this.result['dialer.power_hangsup']);
        resolve();
      };
    });

    // Read the current vibration status
    var vibrationPromise = new Promise(function(resolve, reject) {
      lock.get('vibration.enabled').onsuccess = function() {
        self._observeVibrationEnabled(this.result['vibration.enabled']);
        resolve();
      };
    });

    return Promise.all([ringtonePromise, powerPromise, vibrationPromise]);
  };

  /** Unregister the preferences' listeners. */
  DialerAgent.prototype._unregisterPrefObservers = function() {
    for (var [ key, value ] of this._prefsObservers.entries()) {
      navigator.mozSettings.removeObserver(key, value);
    }
  };

  DialerAgent.prototype.start = function da_start() {
    if (!this._telephony) {
      return;
    }

    if (this._started) {
      throw 'Instance should not be start()\'ed twice.';
    }
    this._started = true;

    var self = this;
    return this._registerPrefObservers().then(function() {
      // We have new default ringtones in 2.0, so check if the version is
      // upgraded then execute the necessary migration.
      if (Service.query('justUpgraded')) {
        LazyLoader.load('js/tone_upgrader.js').then(() => {
          toneUpgrader.perform('ringtone');
        });
      }

      self._telephony.addEventListener('callschanged', self);

      window.addEventListener('sleep', self);
      window.addEventListener('wake', self);
      window.addEventListener('volumedown', self);

      Service.registerState('onCall', self);
    });
  };

  DialerAgent.prototype.stop = function da_stop() {
    if (!this._started) {
      return;
    }
    this._started = false;

    this._unregisterPrefObservers();
    this._telephony.removeEventListener('callschanged', this);

    window.removeEventListener('sleep', this);
    window.removeEventListener('wake', this);
    window.removeEventListener('volumedown', this);

    Service.unregisterState('onCall', this);
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

    if ((evt.type === 'sleep') && this.onCall() && this._powerHangsUp) {
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
