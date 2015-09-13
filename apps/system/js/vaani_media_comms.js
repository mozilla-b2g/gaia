/* global IACHandler */
'use strict';

(function(exports) {
  /**
   * VaaniMediaComms runs at background to bridge the status of media playback
   * widget to Vaani and help Vaani to control music playback widget. The most
   * important reason VaaniMediaComms at System app is that it notifies the
   * existence of Music app to Vaani.
   **/
  var VaaniMediaComms = function() {};
  VaaniMediaComms.prototype = {
    start: function() {
      this.mediaAppOrigin = null;
      // handles media updates from music app.
      window.addEventListener('iac-mediacomms', this);
      // handle vaani commands from vaani app.
      window.addEventListener('iac-vaani-media-comms', this);
      // Listen for when the music app is terminated. We know which app to look
      // for because we got it from the "appinfo" message. Then we hide the Now
      // Playing container. XXX: This is a gigantic hack, stemming from
      // <https://bugzilla.mozilla.org/show_bug.cgi?id=915880>.
      window.addEventListener('appterminated', this);
    },

    stop: function() {
      window.removeEventListener('iac-mediacomms', this);
      window.removeEventListener('iac-vaani-media-comms', this);
      window.removeEventListener('appterminated', this);
    },

    formatISO8610Duration: function(ms) {
      var raw = Math.round(ms / 1000);
      var s = raw % 60;
      var m = Math.floor(raw / 60) % 60;
      var h = Math.floor(raw / 3600);
      return 'PT' + (h > 0 ? h + 'H' : '') + (m > 0 ? m + 'M' : '') + s + 'S';
    },

    handleAppTerminated: function(origin) {
      if (this.mediaAppOrigin === origin) {
        this.sendVaaniMessage({
          '@context': 'http://schema.org',
          '@type': 'DeleteAction',
          'target': {
            'url': origin
          }
        });
      }
    },

    handleMediaComms: function(message) {
      switch (message.type) {
        case 'appinfo':
          this.mediaAppOrigin = message.data.origin;
          break;
        case 'nowplaying':
          var data = {
            '@context': 'http://schema.org',
            '@type': 'UpdateAction',
            'targetCollection': {
              '@type': 'MusicRecording',
              'headline': message.data.title,
              'byArtist': {
                '@type': 'MusicGroup',
                'name': message.data.artist
              },
              'inAlbum': {
                '@type': 'MusicAlbum',
                'name': message.data.album
              },
              'duration': this.formatISO8610Duration(message.data.duration)
            }
          };
          if (message.data.picture) {
            // this part is not at schema.org, we should invent a type to
            // support blob.
            data.targetCollection.thumbnailBlob = message.data.picture;
          }
          this.sendVaaniMessage(data);
          break;
        case 'status':
          this.sendVaaniMessage({
            '@context': 'http://mozilla.org',
            '@type': 'StatusUpdate',
            'status': message.data
          });
          break;
      }
    },

    handleVaaniCommand: function(command) {
      switch(command['@type']) {
        case 'ListenAction':
          this.sendMediaMessage('playpause');
          this.sendVaaniMessage({
            'actionStatus': 'CompletedActionStatus'
          });
          break;
        case 'SuspendAction':
          this.sendMediaMessage('playpause');
          this.sendVaaniMessage({
            'actionStatus': 'CompletedActionStatus'
          });
          break;
        case 'SkipBackwardAction':
          this.sendMediaMessage('prevtrack');
          this.sendVaaniMessage({
            'actionStatus': 'CompletedActionStatus'
          });
          break;
        case 'SkipForwardAction':
          this.sendMediaMessage('nexttrack');
          this.sendVaaniMessage({
            'actionStatus': 'CompletedActionStatus'
          });
          break;
        default:
          this.sendVaaniMessage({
            'actionStatus': 'FailedActionStatus'
          });
          break;
      }
    },

    handleEvent: function(event) {
      switch(event.type) {
        case 'appterminated':
          this.handleAppTerminated(event.detail.origin);
          break;
        case 'iac-mediacomms':
          this.handleMediaComms(event.detail);
          break;
        case 'iac-vaani-media-comms':
          this.handleVaaniCommand(event.detail);
          break;

      }
    },

    sendMediaMessage: function(command) {
      this.sendMessage('mediacomms', { command: command });
    },

    sendVaaniMessage: function(data) {
      this.sendMessage('vaani-media-comms', data);
    },

    sendMessage: function(iac, data) {
      var port = IACHandler.getPort(iac);
      if (port) {
        port.postMessage(data);
      }
    }

  };

  exports.VaaniMediaComms = VaaniMediaComms;
}(window));
