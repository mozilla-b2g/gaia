'use strict';

window.addEventListener('load', function launch() {
  Router.logRouting = true;
  window.musicLibrary = new MusicLibrary();
  window.ui = new MusicUI();
  window.app = new Music();

  window.app.router.when('requestSourceFromSong', function(song) {
    return new FileAudioSource(window.musicLibrary.musicDB, song);
  });

  Router.connect(window.ui, window.app.playingPlaylist, {
    'requestPlaySongs': 'switchToSources',
    'switchPlayingToIndex': 'switchToItem'
  });

  Router.connect(window.app.playingPlaylist, window.ui, {
    'playlistUpdated': 'setPlaylist'
  });

  Router.connect(window.ui.playerView, window.app.playingPlaylist, {
    'play': 'play',
    'pause': 'pause',
    'playPrev': 'playPrev',
    'playNext': 'playNext'
  });

  window.ui.playerView.seekBar.router.when('requestSetTime',
    [window.app.audioPlayer, 'setTime']
  );

  window.app.audioPlayer.router.when('timeUpdated', function(curr, total) {
    window.ui.playerView.seekBar.setCurrentTime(curr);
    window.ui.playerView.seekBar.setTotalTime(total);
  });

});
