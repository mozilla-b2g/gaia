'use strict';

var MusicComms = {
  commands: {
    // For those bluetooth devices that do not keep, request or receive
    // the play status, because the play status may not sync with the player,
    // they will just send "play" or "playpause" when pressing the "playpause"
    // button, so for the "play" and "playpause" commands, we will check
    // the play status for the player then decide we should play or pause.
    play: function(event) {
      this._getPlayerReady(function() {
        this.isSCOEnabled = event.detail.isSCOConnected;
        // Play in shuffle order if music app is launched remotely.
        // Please note bug 855208, if music app is launched via system message
        // in background, the audio channel will be paused.
        if (PlayerView.playStatus === PLAYSTATUS_STOPPED) {
          musicdb.getAll(function remote_getAll(dataArray) {
            PlayerView.setSourceType(TYPE_MIX);
            PlayerView.dataSource = dataArray;
            PlayerView.setShuffle(true);
            PlayerView.play(PlayerView.shuffledList[0]);

            ModeManager.push(MODE_PLAYER);
          });
        } else if (PlayerView.playStatus === PLAYSTATUS_PLAYING) {
          PlayerView.pause();
        } else {
          PlayerView.play();
        }
      }.bind(this));
    },

    playpause: function(event) {
      if (PlayerView.playStatus === PLAYSTATUS_PLAYING)
        PlayerView.pause();
      else
        PlayerView.play();
    },

    pause: function(event) {
      if (!this._isPlayerActivated())
        return;

      this.isSCOEnabled = event.detail.isSCOConnected;
      PlayerView.pause();
    },

    stop: function(event) {
      if (!this._isPlayerActivated())
        return;

      PlayerView.stop();
    },

    next: function(event) {
      if (!this._isPlayerActivated())
        return;

      PlayerView.next();
    },

    previous: function(event) {
      if (!this._isPlayerActivated())
        return;

      PlayerView.previous();
    },

    seekpress: function(event) {
      if (!this._isPlayerActivated())
        return;

      if (!PlayerView.isTouching)
        PlayerView.startFastSeeking(event.detail.direction);
    },

    seekrelease: function(event) {
      if (!this._isPlayerActivated())
        return;

      PlayerView.stopFastSeeking();
    },

    updatemetadata: function() {
      PlayerView.updateRemoteMetadata();
    },

    updateplaystatus: function() {
      PlayerView.updateRemotePlayStatus();
    }
  },

  enabled: false,

  isSCOEnabled: false,

  init: function() {
    // The Media Remote Controls object will handle the remote commands.
    this.mrc = new MediaRemoteControls();
    // Add command listeners base on what commands the MusicComms has.
    for (var command in this.commands)
      this.mrc.addCommandListener(command, this.commands[command].bind(this));

    this.mrc.start();

    this.mrc.notifyAppInfo({
      origin: window.location.origin,
      icon: window.location.origin + '/style/icons/Music_60.png'
    });

    this.enabled = true;
  },

  _getPlayerReady: function(callback) {
    if (typeof PlayerView === 'undefined') {
      LazyLoader.load('js/Player.js', function() {
        PlayerView.init();
        PlayerView.setOptions(playerSettings);

        callback();
      });
    } else {
      callback();
    }
  },

  _isPlayerActivated: function() {
    return (typeof PlayerView !== 'undefined' &&
      PlayerView.playStatus !== PLAYSTATUS_STOPPED);
  },

  notifyMetadataChanged: function(metadata) {
    if (this.enabled)
      this.mrc.notifyMetadataChanged(metadata);
  },

  notifyStatusChanged: function(info) {
    if (this.enabled)
      this.mrc.notifyStatusChanged(info);
  },

  updateSCOStatus: function() {
    if (this.enabled) {
      this.mrc.getSCOStatus(function(status) {
        this.isSCOEnabled = status;
      }.bind(this));
    }
  }
};
