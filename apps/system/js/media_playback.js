/* global Bluetooth, IACHandler, appWindowManager */

'use strict';

function MediaPlaybackWidget(container, options) {
  this.container = container;
  this.nowPlaying = container.querySelector('.media-playback-nowplaying');
  this.controls = container.querySelector('.media-playback-controls');

  this.track = container.querySelector('.track');

  this.previousButton = container.querySelector('.previous');
  this.playPauseButton = container.querySelector('.play-pause');
  this.nextButton = container.querySelector('.next');

  this.previousButton.addEventListener(
    'contextmenu', this.handleContextmenu.bind(this)
  );
  this.nextButton.addEventListener(
    'contextmenu', this.handleContextmenu.bind(this)
  );
  this.container.addEventListener('touchend', this.handleTouchend.bind(this));

  // When prev/next button releases, we need to know user simply clicking on it
  // or holding on and perform fastseeking. Keeping this state to know which
  // command should issue.
  this.isFastSeeking = false;

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
    if (track) {
      this.track.removeAttribute('data-l10n-id');
      this.track.textContent = track;
    } else {
      this.track.setAttribute('data-l10n-id', 'UnknownTrack');
    }
  },

  updatePlaybackStatus: function mp_updatePlaybackStatus(status) {
    switch (status.playStatus) {
      case 'PLAYING':
        this.hidden = false;
        this.playPauseButton.dataset.icon = 'pause';
        this.playPauseButton.setAttribute('data-l10n-id',
          'mediaPlaybackPause');
        break;
      case 'PAUSED':
        this.hidden = false;
        this.playPauseButton.dataset.icon = 'play';
        this.playPauseButton.setAttribute('data-l10n-id',
          'mediaPlaybackPlay');
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
        detail: appWindowManager.getApp(this.origin)
      });
      window.dispatchEvent(evt);
    }
  },

  sendCommand: function mp_sendCommand(command) {
    var port = IACHandler.getPort('mediacomms');
    if (port) {
      port.postMessage({command: command});
    }
  },

  handleContextmenu: function mp_handleContextmenu(event) {
    var command = null;

    switch (event.target) {
      case this.previousButton:
        command = 'rewindstart';
        break;
      case this.nextButton:
        command = 'fastforwardstart';
        break;
    }

    if (command) {
      this.isFastSeeking = true;
      this.sendCommand(command);
    }
  },

  handleTouchend: function mp_handleTouchend(event) {
    var command = null;

    switch (event.target) {
      case this.previousButton:
        if (this.isFastSeeking) {
          this.isFastSeeking = false;
          command = 'rewindend';
        } else {
          command = 'prevtrack';
        }
        break;
      case this.nextButton:
        if (this.isFastSeeking) {
          this.isFastSeeking = false;
          command = 'fastforwardend';
        } else {
          command = 'nexttrack';
        }
        break;
      case this.playPauseButton:
        // The play/pause indicator will get set once the music app replies
        // with its "mode" message, but this will make us appear speedier.
        event.target.classList.toggle('is-paused');
        command = 'playpause';
        break;
    }

    if (command) {
      this.sendCommand(command);
    }
  }
};
