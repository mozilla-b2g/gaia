'use strict';

/* global SettingsListener, SettingsURL, AttentionScreen, lockScreen */
/* r=? dialer+system peers for changes in this file. */

(function(exports) {
  /**
   *
   * The delay between an incoming phone call and the first ring or vibration
   * needs to be as short as possible.
   *
   * This simple module keeps the ringtone (blob) around and starts alerting the
   * user as soon as a new incoming call is detected via the mozTelephony API.
   * And it opens an AttentionScreen with the preloaded callscreen app inside.
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
   *
   **/

  var CSORIGIN = window.location.origin.replace('system', 'callscreen') + '/';

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

    SettingsListener.observe('vibration.enabled', true, function(value) {
      this._shouldVibrate = !!value;
    }.bind(this));

    this._telephony.addEventListener('callschanged', this);

    window.addEventListener('sleep', this);
    window.addEventListener('volumedown', this);

    this._callScreen = this._createCallScreen();
    var callScreen = this._callScreen;
    callScreen.src = CSORIGIN + 'index.html';
    callScreen.dataset.preloaded = true;
    // We need the iframe in the DOM
    AttentionScreen.attentionScreen.appendChild(callScreen);

    callScreen.setVisible(false);

    return this;
  };

  DialerAgent.prototype.stop = function da_stop() {
    if (!this._started) {
      return;
    }
    this._started = false;

    this._telephony.removeEventListener('callschanged', this);

    window.removeEventListener('sleep', this);
    window.removeEventListener('volumedown', this);

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
    if (calls.length !== 1) {
      return;
    }

    if (calls[0].state === 'incoming' || calls[0].state === 'dialing') {
      this._openCallScreen();
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

  DialerAgent.prototype._createCallScreen = function da_createCallScreen() {
    // TODO: use a BrowswerFrame
    // https://bugzilla.mozilla.org/show_bug.cgi?id=995979
    var iframe = document.createElement('iframe');
    iframe.setAttribute('name', 'call_screen');
    iframe.setAttribute('mozbrowser', 'true');
    iframe.setAttribute('remote', 'false');
    iframe.setAttribute('mozapp', CSORIGIN + 'manifest.webapp');
    iframe.dataset.frameOrigin = CSORIGIN;
    iframe.dataset.hidden = 'true';

    return iframe;
  };

  DialerAgent.prototype._openCallScreen = function da_openCallScreen() {
    var callScreen = this._callScreen;
    var timestamp = new Date().getTime();

    var src = CSORIGIN + 'index.html' + '#' +
              (lockScreen.locked ? 'locked' : '');
    src = src + '&timestamp=' + timestamp;
    callScreen.src = src;
    callScreen.setVisible(true);

    var asRequest = {
      target: callScreen,
      stopPropagation: function() {},
      detail: {
        features: 'attention',
        name: 'call_screen',
        frameElement: callScreen
      }
    };
    AttentionScreen.open(asRequest);
  };

  exports.DialerAgent = DialerAgent;
}(window));
