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
    'bluetoothprofileconnectionchange', this.handleSCOChange.bind(this)
  );

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

  handleSCOChange: function mpw_handleSCOChange(event) {
    var name = event.detail.name;
    var connected = event.detail.connected;

    if (name === Bluetooth.Profiles.SCO) {
      this.container.classList.toggle('disabled', connected);
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
