/*
 * Media App Agent(MAA) is a system submodule for low-end devices to take charge
 * of the media app, it should only enable on the devices with limited memory.
 *
 * What MAA is trying to solve is the unexpected crash of the playing media app.
 * After the communication app launched and triggered the Low Memory Killer(LMK)
 * killed the interrupted media app, MAA is able to re-launch it by listening to
 * the telephony state change and interacting with the media playback widget.
 * Also it records the interrupted position so that once the media app is
 * restored, the media app can play the interrupted song from the interrupted
 * position.
 */

'use strict';

var MediaAppAgent = {
  playStatus: 'STOPPED',

  killedOrigin: null,

  get origin() {
    return this._origin;
  },

  set origin(url) {
    if (url && url !== this.origin) {
      this.killedOrigin = null;
      this._handleMediaAppFrame(url);
    }

    return this._origin = url;
  },

  get position() {
    return this._position;
  },

  set position(position) {
    // When every time the position is changed, reset the start point and start
    // to record again.
    this._startRecording();
    return this._position = position;
  },

  init: function maa_init() {
    this.origin = null;
    this._telephony = navigator.mozTelephony;
    this._telephony.addEventListener(
      'callschanged', this._handleTelephony.bind(this)
    );

    // When we receive the mozmemorypressure event, check the media app status
    // to decide if we can close it to release the memory that supposed to be
    // freed if the media app is out-of-process.
    window.addEventListener(
      'mozmemorypressure', this._handleMemorypressure.bind(this)
    );
  },

  _startRecording: function maa_startRecording() {
    this.start = Date.now();
  },

  _stopRecording: function maa_stopRecording() {
    this._position = this.position + (Date.now() - this.start);
  },

  _handleMediaAppFrame: function maa_handleMediaAppFrame(url) {
    var appFrame = WindowManager.getAppFrame(url);

    if (appFrame) {
      appFrame.addEventListener('mozbrowsererror', function(evt) {
        // See if evt.detail.type helps here.
        this.killedOrigin = url;
        this.origin = null;
      }.bind(this));
    }
  },

  _handleTelephony: function maa_handleTelephony() {
    var calls = this._telephony.calls;
    if (calls.length !== 1 || calls[0].state !== 'incoming') {
      return;
    }

    // If the media app is killed before we received the call, then the last
    // play status should be STOPPED.
    if (this.killedOrigin) {
      this.playStatus = 'STOPPED';
    }

    // When a incoming call comes, the media app should be interrupted, so stop
    // the recording and we can know the interrupted position.
    this._stopRecording();

    // Listen to the state change of the incoming call so that we can re-launch
    // the media app after the call ends, if the media app is killed later.
    var incomingCall = calls[0];
    incomingCall.addEventListener('statechange', function callStateChange() {
      incomingCall.removeEventListener('statechange', callStateChange);

      // After the incoming call is disconnected, check the media app is killed
      // or not, then tell it to resume by setting the value via mozSettings.
      if (incomingCall.state === 'disconnected') {
        var willResume = (this.playStatus === 'PLAYING' ||
                          this.playStatus === 'mozinterruptbegin') &&
                          this.killedOrigin;

        if (willResume) {
          var origin = this.killedOrigin;
          this._tellMediaAppToResume(this._launchMediaApp.bind(this, origin));
        } else {
          this._tellMediaAppToResume();
        }

        this.killedOrigin = null;
      }
    }.bind(this));
  },

  _handleMemorypressure: function maa_handleMemorypressure(event) {
    switch (this.playStatus) {
      case 'STOPPED':
        WindowManager.kill(this.origin);
        break;
      // Should we kill the media app because the player is paused/interrupted?
      // Maybe use a timer to check if the user has paused the player, or the
      // player is interrupted for a while, so that we can assume the user also
      // expect the media app is closed silently.
      case 'PAUSED':
        WindowManager.kill(this.origin);
        break;
      case 'mozinterruptbegin':
        WindowManager.kill(this.origin);
        break;
    }
  },

  _tellMediaAppToResume: function maa_tellMediaAppToResume(callback) {
    var settings = {
      'music.isKilledByTelephony': callback ? this.position / 1000 : -1
    };
    var lock = navigator.mozSettings.createLock();
    var result = lock.set(settings);

    result.onsuccess = function() {
      if (callback) {
        callback();
      }
    };

    result.onerror = function() {
      console.error('Set music.isKilledByTelephony failed!');
    };
  },

  _launchMediaApp: function maa_launchMediaApp(origin) {
    var manifestURL = origin + '/manifest.webapp';
    var app = Applications.getByManifestURL(manifestURL);
    if (app) {
      app.launch();
    }
  }
};

MediaAppAgent.init();
