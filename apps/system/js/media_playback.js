/* global Bluetooth, AppWindowManager, IACHandler */

'use strict';

function MediaPlaybackWidget(container, options) {
  this.container = container;
  this.nowPlaying = container.querySelector('.media-playback-nowplaying');
  this.controls = container.querySelector('.media-playback-controls');

  this.track = container.querySelector('.track');

  this.previousButton = container.querySelector('.previous');
  this.playPauseButton = container.querySelector('.play-pause');
  this.nextButton = container.querySelector('.next');

  this.container.addEventListener('click', this);
  window.addEventListener('iac-mediacomms', this.handleMessage.bind(this));
  // When SCO status changes, we need to adjust the ui of the playback controls
  window.addEventListener(
    'bluetoothprofileconnectionchange', this.handleBluetoothChange.bind(this)
  );

  // Listen to the headphoneschange event for monitoring the audio routing.
  var acm = navigator.mozAudioChannelManager;
  if (acm) {
    acm.addEventListener(
      'headphoneschange', this.handleHeadphonesChange.bind(this)
    );
  }
  this.audioRouting = 'speaker';

  if (options && options.nowPlayingAction === 'openapp') {
    this.nowPlaying.addEventListener('click', this.openMediaApp.bind(this));
  }

  // Listen for when the music app is terminated. We know which app to look
  // for because we got it from the "appinfo" message. Then we hide the Now
  // Playing container. XXX: This is a gigantic hack, stemming from
  // <https://bugzilla.mozilla.org/show_bug.cgi?id=915880>. If you're thinking
  // about doing something similar, step away from your keyboard immediately.
  window.addEventListener('appterminated', function(event) {
    if (event.detail.origin === this.origin) {
      this.hidden = true;
    }
  }.bind(this));
}

MediaPlaybackWidget.prototype = {
  get hidden() {
    return this.container.hidden;
  },

  set hidden(value) {
    this.container.hidden = value;
  },

  handleMessage: function mpw_handleMessage(event) {
    var message = event.detail;
    switch (message.type) {
      case 'appinfo':
        this.updateAppInfo(message.data);
        break;
      case 'nowplaying':
        this.updateNowPlaying(message.data);
        break;
      case 'status':
        this.updatePlaybackStatus(message.data);
        break;
    }
  },

  handleHeadphonesChange: function mpw_handleHeadphonesChange(event) {
    this.handleAudioRouteChange(event, 'wired');
  },

  handleBluetoothChange: function mpw_handleBluetoothChange(event) {
    var name = event.detail.name;
    var connected = event.detail.connected;

    if (name === Bluetooth.Profiles.SCO) {
      this.container.classList.toggle('disabled', connected);
    } else if (name === Bluetooth.Profiles.A2DP) {
      this.handleAudioRouteChange(event, 'bluetooth');
    }
  },

  // Because currently the mozAudioChannelManager does not provide any api for
  // querying the active headphones/headset(audio routing), so to fit the ux
  // requirement, we have to monitor the wired headphones and bluetooth headset
  // statuses in system, then decide if we want to pause the music player after
  // one of the headphones/headset is disconnected.
  // We should move this logic back to shared/js/media/remote_controls.js since
  // the remote logics should be handled in remote controls module.
  handleAudioRouteChange: function mpw_handleAudioRouteChange(event, reason) {
    var isWiredHeadphonesConnected = false;
    var isBluetoothHeadsetConnected = false;

    if (reason === 'wired') {
      isWiredHeadphonesConnected = event.target.headphones;
    } else {
      isBluetoothHeadsetConnected = event.detail.connected;
    }

    // Save the audio routing when one of the headphones/headset is connected.
    if (isWiredHeadphonesConnected || isBluetoothHeadsetConnected) {
      this.audioRouting = isWiredHeadphonesConnected ? 'wired' : 'bluetooth';
    } else {
      // Check if it's disconnecting the active headphones/headset.
      // If so, then send pause command via IAC to notify the music app.
      if (reason === this.audioRouting) {
        var port = IACHandler.getPort('mediacomms');
        if (port) {
          port.postMessage({command: 'pause'});
        }
      } else if (reason !== 'wired' && reason !== 'bluetooth') {
        throw Error('Not audio route changed from wired or bluetooth!');
      }

      isWiredHeadphonesConnected = navigator.mozAudioChannelManager &&
        navigator.mozAudioChannelManager.headphones;
      isBluetoothHeadsetConnected =
        Bluetooth.isProfileConnected(Bluetooth.Profiles.A2DP);

      // Save the correct audio routing for next unplugged/disconnected event
      if (isWiredHeadphonesConnected) {
        this.audioRouting = 'wired';
      } else if (isBluetoothHeadsetConnected) {
        this.audioRouting = 'bluetooth';
      } else {
        this.audioRouting = 'speaker';
      }
    }
  },

  updateAppInfo: function mpw_updateAppInfo(info) {
    if (!info) {
      return;
    }

    this.origin = info.origin;
  },

  updateNowPlaying: function mpw_updateNowPlaying(metadata) {
    if (!metadata) {
      return;
    }

    var title = metadata.title.trim();
    var artist = metadata.artist.trim();
    var track = [];

    if (title) {
      track.push(title);
    }
    if (artist) {
      track.push(artist);
    }
    track = track.join(' — '); // Using a &mdash; here.
    this.track.textContent = track || navigator.mozL10n.get('UnknownTrack');
  },

  updatePlaybackStatus: function mp_updatePlaybackStatus(status) {
    var _ = navigator.mozL10n.get;
    switch (status.playStatus) {
      case 'PLAYING':
        this.hidden = false;
        this.playPauseButton.dataset.icon = 'pause';
        this.playPauseButton.setAttribute('aria-label',
          _('mediaPlaybackPause'));
        break;
      case 'PAUSED':
        this.hidden = false;
        this.playPauseButton.dataset.icon = 'play';
        this.playPauseButton.setAttribute('aria-label', _('mediaPlaybackPlay'));
        break;
      case 'STOPPED':
        this.hidden = true;
        break;
      case 'mozinterruptbegin':
        this.hidden = true;
        break;
    }
  },

  openMediaApp: function mp_openMediaApp(event) {
    if (this.origin) {
      var evt = new CustomEvent('displayapp', {
        bubbles: true,
        cancelable: true,
        detail: AppWindowManager.getApp(this.origin)
      });
      window.dispatchEvent(evt);
    }
  },

  handleEvent: function mp_handleEvent(event) {
    var port = IACHandler.getPort('mediacomms');
    if (!port) {
      return;
    }

    var target = event.target;
    var command = null;

    switch (target) {
      case this.previousButton:
        command = 'prevtrack';
        break;
      case this.playPauseButton:
        // The play/pause indicator will get set once the music app replies with
        // its "mode" message, but this will make us appear speedier.
        if (target.dataset.icon === 'play') {
          target.dataset.icon = 'pause';
        } else {
          target.dataset.icon = 'play';
        }
        command = 'playpause';
        break;
      case this.nextButton:
        command = 'nexttrack';
        break;
    }

    if (command) {
      port.postMessage({command: command});
    }
  }
};
