'use strict';

function MediaPlaybackWidget(container, options) {
  this.container = container;
  this.nowPlaying = container.querySelector('.media-playback-nowplaying');
  this.controls = container.querySelector('.media-playback-controls');

  this.icon = container.querySelector('.icon');
  this.trackTitle = container.querySelector('.title');
  this.trackArtist = container.querySelector('.artist');
  this.albumArt = container.querySelector('.albumart');

  this.previousButton = container.querySelector('.previous');
  this.playPauseButton = container.querySelector('.play-pause');
  this.nextButton = container.querySelector('.next');

  this.container.addEventListener('click', this);
  window.addEventListener('iac-mediacomms', this.handleMessage.bind(this));
  // When SCO status changes, we need to adjust the ui of the playback controls
  window.addEventListener(
    'bluetoothprofileconnectionchange', this.handleSCOChange.bind(this)
  );

  if (options && options.nowPlayingAction === 'openapp')
    this.nowPlaying.addEventListener('click', this.openMediaApp.bind(this));

  // Listen for when the music app is terminated. We know which app to look
  // for because we got it from the "appinfo" message. Then we hide the Now
  // Playing container. XXX: This is a gigantic hack, stemming from
  // <https://bugzilla.mozilla.org/show_bug.cgi?id=915880>. If you're thinking
  // about doing something similar, step away from your keyboard immediately.
  window.addEventListener('appterminated', function(event) {
    if (event.detail.origin === this.origin)
      this.hidden = true;
  }.bind(this));
}

MediaPlaybackWidget.prototype = {
  get hidden() {
    return this.container.hidden;
  },

  set hidden(value) {
    return this.container.hidden = value;
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

    if (name === Bluetooth.Profiles.SCO)
      this.container.classList.toggle('disabled', connected);
  },

  updateAppInfo: function mpw_updateAppInfo(info) {
    if (!info)
      return;

    this.origin = info.origin;
    this.icon.style.backgroundImage = 'url(' + info.icon + ')';
  },

  updateNowPlaying: function mpw_updateNowPlaying(metadata) {
    if (!metadata)
      return;

    this.trackTitle.textContent = metadata.title;
    this.trackArtist.textContent = metadata.artist;

    // The music app doesn't send a .picture attribute if it hasn't changed
    // (and it was a placeholder image). Don't bother updating the picture if
    // so. However, if .picture is null, something probably went wrong, so we
    // just won't show a picture at all.
    if ('picture' in metadata) {
      if (this.url)
        URL.revokeObjectURL(this.url);
      if (metadata.picture) {
        this.url = URL.createObjectURL(metadata.picture);
        this.albumArt.style.backgroundImage = 'url(' + this.url + ')';
      } else {
        this.albumArt.style.backgroundImage = '';
      }
    }
  },

  updatePlaybackStatus: function mp_updatePlaybackStatus(status) {
    switch (status.playStatus) {
      case 'PLAYING':
        this.hidden = false;
        this.playPauseButton.classList.remove('is-paused');
        break;
      case 'PAUSED':
        this.hidden = false;
        this.playPauseButton.classList.add('is-paused');
        break;
      case 'STOPPED':
        this.hidden = true;
        break;
      case 'mozinterruptbegin':
        this.hidden = true;
        break;
      case 'mozinterruptend':
        this.hidden = false;
        break;
    }
  },

  openMediaApp: function mp_openMediaApp(event) {
    if (this.origin) {
      var evt = new CustomEvent('displayapp', {
        bubbles: true,
        cancelable: true,
        detail: { origin: this.origin }
      });
      window.dispatchEvent(evt);
    }
  },

  handleEvent: function mp_handleEvent(event) {
    var port = IACHandler.getPort('mediacomms');
    if (!port)
      return;

    var target = event.target;
    var command = null;

    switch (target) {
      case this.previousButton:
        command = 'prevtrack';
        break;
      case this.playPauseButton:
        // The play/pause indicator will get set once the music app replies with
        // its "mode" message, but this will make us appear speedier.
        target.classList.toggle('is-paused');
        command = 'playpause';
        break;
      case this.nextButton:
        command = 'nexttrack';
        break;
    }

    if (command)
      port.postMessage({command: command});
  }
};
