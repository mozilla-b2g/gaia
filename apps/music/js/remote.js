/* exported Remote */
/* global LazyLoader, MediaRemoteControls, bridge */
'use strict';

var Remote = (function() {
  const PLAY_STATUS_INTERRUPTED = 'mozinterruptbegin';
  const PLAYSTATUS_STOPPED      = 'STOPPED';
  const PLAY_STATUS_PAUSED      = 'PAUSED';
  const PLAY_STATUS_PLAYING     = 'PLAYING';

  var Remote = {
    enabled: false,
    isSCOEnabled: false,

    updateMetadata: function() {
      if (Remote.enabled) {
        client.method('getPlaybackStatus').then((status) => {
          client.method('getSong', status.filePath).then((song) => {
            if (!song) {
              return;
            }

            client.method('getSongThumbnail', status.filePath).then((blob) => {
              document.l10n.formatValues(
                'unknownTitle', 'unknownArtist', 'unknownAlbum'
              ).then(([unknownTitle, unknownArtist, unknownAlbum]) => {
                mrc.notifyMetadataChanged({
                  title:  song.metadata.title  || unknownTitle,
                  artist: song.metadata.artist || unknownArtist,
                  album:  song.metadata.album  || unknownAlbum,
                  mediaNumber:     status.queueRawIndex,
                  totalMediaCount: status.queueLength,
                  duration:        status.duration,
                  picture: blob
                });
              });
            });
          });
        });
      }
    },

    updatePlaybackStatus: function() {
      if (Remote.enabled) {
        client.method('getPlaybackStatus').then((status) => {
          var playStatus = status.stopped ? PLAYSTATUS_STOPPED :
            (status.paused ? PLAY_STATUS_PAUSED : PLAY_STATUS_PLAYING);

          if (status.isInterrupted) {
            playStatus = PLAY_STATUS_INTERRUPTED;
          }

          mrc.notifyStatusChanged({
            playStatus: playStatus,
            duration: status.duration,
            position: status.elapsedTime
          });
        });
      }
    }
  };

  var mrc; // Lazy-initialized

  var client = bridge.client({
    service: 'music-service',
    endpoint: window,
    timeout: false
  });

  var commands = {
    play: function(evt) {
      commands.playpause(evt);
    },

    // For those bluetooth devices that do not keep, request or receive
    // the play status, because the play status may not sync with the player,
    // they will just send "play" or "playpause" when pressing the "playpause"
    // button, so for the "play" and "playpause" commands, we will check
    // the play status for the player then decide we should play or pause.
    playpause: function(evt) {
      var isResumedBySCO = Remote.isSCOEnabled;
      Remote.isSCOEnabled = evt.detail.isSCOConnected;

      client.method('getPlaybackStatus').then((status) => {
        // Check if it's resumed by the SCO disconnection, if so, we need to
        // recover the player to the original status.
        if (isResumedBySCO) {
          client.method(status.paused ? 'play' : 'pause');
        } else {
          // Play in shuffle order if music app is launched remotely.
          if (!status.filePath) {
            client.method('queuePlaylist', 'shuffle-all');
          } else {
            client.method(status.paused ? 'play' : 'pause');
          }
        }
      });
    },

    pause: function(evt) {
      Remote.isSCOEnabled = evt.detail.isSCOConnected;

      client.method('pause');
    },

    stop: function() {
      client.method('pause');
    },

    next: function() {
      client.method('nextSong');
    },

    previous: function() {
      client.method('previousSong');
    },

    seekpress: function(evt) {
      client.method('startFastSeek', evt.detail.direction === -1);
    },

    seekrelease: function() {
      client.method('stopFastSeek');
    },

    updatemetadata: function() {
      // After A2DP is connected, some bluetooth devices will try to synchronize
      // the playing metadata with the player, if the player is not ready, we
      // have to initial the player to have the metadata, even the player is
      // stopped.
      Remote.updateMetadata();
    },

    updateplaystatus: function() {
      // After A2DP is connected, some bluetooth devices will try to synchronize
      // the playstatus with the player, if the player is not ready, we have to
      // initial the player to have the play status.
      Remote.updatePlaybackStatus();
    }
  };

  var scripts = [
    '/shared/js/bluetooth_helper.js',
    '/shared/js/media/remote_controls.js'
  ];

  LazyLoader.load(scripts).then(() => {
    mrc = new MediaRemoteControls();

    for (var command in commands) {
      mrc.addCommandListener(command, commands[command]);
    }

    mrc.start(() => {
      if (Remote.enabled) {
        mrc.getSCOStatus(status => Remote.isSCOEnabled = status);
      }
    });

    mrc.notifyAppInfo({
      origin: window.location.origin,
      icon: window.location.origin + '/style/icons/music_84.png'
    });

    client.on('songChange', Remote.updateMetadata);

    client.on('play', Remote.updatePlaybackStatus);
    client.on('pause', Remote.updatePlaybackStatus);
    client.on('stop', Remote.updatePlaybackStatus);
    client.on('elapsedTimeChange', Remote.updatePlaybackStatus);
    client.on('interruptBegin', Remote.updatePlaybackStatus);
    client.on('interruptEnd', Remote.updatePlaybackStatus);

    Remote.enabled = true;
  });

  return Remote;
})();
