'use strict';

/* global SettingsListener, SettingsURL, CallscreenWindow, applications */
/* global VersionHelper, LazyLoader, toneUpgrader */
/* r=? dialer+system peers for changes in this file. */

(function(exports) {
  /**
   *
   * The delay between an incoming phone call and the first ring or vibration
   * needs to be as short as possible.
   *
   * This simple module keeps the ringtone (blob) around and starts alerting the
   * user as soon as a new incoming call is detected via the mozTelephony API.
   * And it opens an AttentionWindow with the preloaded callscreen app inside.
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
   * @requires VersionHelper
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
    this._shouldRing = null;
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
    this.freeCallscreenWindow = this.freeCallscreenWindow.bind(this);
    this.makeFakeNotification = this.makeFakeNotification.bind(this);
  };

  DialerAgent.prototype.freeCallscreenWindow = function() {
    if (this._callscreenWindow) {
      this._callscreenWindow.free();
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

    SettingsListener.observe('audio.volume.notification', 7, function(value) {
      this._shouldRing = !!value;
      if (this._shouldRing && this._alerting) {
        this._player.play();
      }
    }.bind(this));

    SettingsListener.observe('dialer.ringtone', '', function(value) {
      var phoneSoundURL = new SettingsURL();

      this._player.pause();
      this._player.src = phoneSoundURL.set(value);

      if (this._shouldRing && this._alerting) {
        this._player.play();
      }
    }.bind(this));

    // We have new default ringtones in 2.0, so check if the version is upgraded
    // then execute the necessary migration.
    VersionHelper.getVersionInfo().then(function(versionInfo) {
      if (versionInfo.isUpgrade()) {
        LazyLoader.load('js/tone_upgrader.js', function() {
          toneUpgrader.perform('ringtone');
        });
      }
    }, function(err) {
      console.error('VersionHelper failed to lookup version settings.');
    });

    SettingsListener.observe('vibration.enabled', true, function(value) {
      this._shouldVibrate = !!value;
    }.bind(this));

    this._telephony.addEventListener('callschanged', this);

    window.addEventListener('sleep', this);
    window.addEventListener('volumedown', this);
    window.addEventListener('mozmemorypressure', this.freeCallscreenWindow);

    this._callscreenWindow = new CallscreenWindow();
    this._callscreenWindow.hide();

    if (applications && applications.ready) {
      this.makeFakeNotification();
    } else {
      window.addEventListener('applicationready', this.makeFakeNotification);
    }

    return this;
  };

  DialerAgent.prototype.makeFakeNotification = function() {
    window.removeEventListener('applicationready', this.makeFakeNotification);
    this._callscreenWindow && this._callscreenWindow.makeNotification();
  };

  DialerAgent.prototype.stop = function da_stop() {
    if (!this._started) {
      return;
    }
    this._started = false;

    this._telephony.removeEventListener('callschanged', this);

    window.removeEventListener('sleep', this);
    window.removeEventListener('volumedown', this);
    window.removeEventListener('mozmemorypressure', this.freeCallscreenWindow);

    // TODO: should remove the settings listener once the helper
    // allows it.
    // See bug 981373.
  };

  DialerAgent.prototype.handleEvent = function da_handleEvent(evt) {
    if (evt.type === 'sleep' || evt.type === 'volumedown') {
      this._stopAlerting();
      return;
    }

    if (evt.type !== 'callschanged') {
      return;
    }

    var calls = this._telephony.calls;
    if (calls.length === 0) {
      return;
    }

    var calling = calls.some(function(call) {
      if (call.state === 'incoming' || call.state === 'dialing') {
        return true;
      }
    });

    if (calling) {
      this.openCallscreen();
    }

    if (this._alerting || calls[0].state !== 'incoming') {
      return;
    }

    var incomingCall = calls[0];
    var self = this;

    self._startAlerting();

    incomingCall.addEventListener('statechange', function callStateChange() {
      incomingCall.removeEventListener('statechange', callStateChange);

      self._stopAlerting();
    });
  };

  DialerAgent.prototype._startAlerting = function da_startAlerting() {
    this._alerting = true;

    if ('vibrate' in navigator && this._shouldVibrate) {
      this._vibrateInterval = window.setInterval(function vibrate() {
        navigator.vibrate([200]);
      }, 600);
      navigator.vibrate([200]);
    }

    if (this._shouldRing) {
      this._player.play();
    }
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

  DialerAgent.prototype.openCallscreen = function() {
    if (this._callscreenWindow) {
      this._callscreenWindow.ensure();
      this._callscreenWindow.requestOpen();
    }
  };

  exports.DialerAgent = DialerAgent;
}(window));
