'use strict';

var MediaPlayback = {
  init: function mp_init() {
    this.container = document.getElementById('media-playback-container');
    this.nowPlaying = document.getElementById('media-playback-nowplaying');
    this.icon = this.container.querySelector('.icon');
    this.trackTitle = this.container.querySelector('.title');
    this.trackArtist = this.container.querySelector('.artist');
    this.albumArt = this.container.querySelector('.albumart');

    var self = this;
    window.navigator.mozSetMessageHandler('connection', function(request) {
      if (request.keyword !== 'mediacomms')
        return;

      var port = request.port;
      port.onmessage = function(event) {
        var message = event.data;
        switch (message.type) {
        case 'appinfo':
          self.updateAppInfo(message.data);
          break;
        case 'nowplaying':
          self.updateNowPlaying(message.data);
          break;
        case 'status':
          self.updatePlaybackStatus(message.data);
          break;
        }
      };
    });

    this.nowPlaying.addEventListener('click', this.openMediaApp.bind(this));

    // Listen for when the music app is terminated. We know which app to look
    // for because we got it from the "appinfo" message. Then we hide the Now
    // Playing container. XXX: This is a gigantic hack. If you're thinking about
    // doing something similar, step away from your keyboard immediately.
    window.addEventListener('appterminated', function(event) {
      if (event.detail.origin === this.origin)
        this.container.hidden = true;
    }.bind(this));
  },

  updateAppInfo: function mp_updateAppInfo(info) {
    if (!info)
      return;

    this.origin = info.origin;
    this.icon.style.backgroundImage = 'url(' + info.icon + ')';
  },

  updateNowPlaying: function mp_updateNowPlaying(metadata) {
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
    this.container.hidden = (status.playStatus === 'STOPPED');
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
  }
};

MediaPlayback.init();
