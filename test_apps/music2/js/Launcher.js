window.addEventListener('load', function launch(){

  Router.logRouting = true;
  window.musicLibrary = new MusicLibrary();
  window.ui = new MusicUI();
  window.app = new Music(); 

  //============== MusicLibrary --> UI ===============

  Router.connect(window.musicLibrary, window.ui.mediaLibraryPage, {
    'loading':      'setLoading',
    'doneLoading':  'setDoneLoading',
    'songRemoved':  'notifySongRemoved',
    'songFound':   'notifySongFound',
    'noMusic': 'displayNoMusic'
  });

  window.musicLibrary.router.when('musicChanged', [window.ui, 'musicChanged']);

  //============== UI --> APP ===============

  window.ui.router.when('requestAddSongs', [window.app.playingPlaylist, 'enqueue']);

  Router.connect(window.ui.currentMusicPage.controls, window.app.playingPlaylist, {
    'play': 'play',
    'pause': 'pause',
    'playPrev': 'playPrev',
    'playNext': 'playNext'
  });

  window.ui.currentMusicPage.controls.seekBar.router.when('requestSetTime', [window.app.audioPlayer, 'setTime']);

  Router.connect(window.ui.currentMusicPage.playlist, window.app.playingPlaylist, {
    'deleteItemFromPlayingPlaylist': 'deleteItem',
    'switchToPlaylistItem': 'switchToItem',
    'movePlaylistItemRelative': 'moveItem',
  });

  Router.connect(window.ui.currentMusicPage.playlist, window.app, {
    'requestAddSongsToCustom': 'addSongsToCustom',
    'shareSong': 'shareSong',
  });

  Router.connect(window.ui.currentMusicPage.options, window.app.playingPlaylist, {
    'savePlaylist': 'savePlaylist',
    'clearPlaylist': 'clearPlaylist',
    'shufflePlaylist': 'shufflePlaylist',
    'renamePlaylist': 'renamePlaylist',
    'playlistify': 'simpleToPlaylist',
    'deletePlaylist': 'deletePlaylist',
    'closePlaylist': 'switchToSimpleMode'
  });

  window.ui.mediaLibraryPage.router.when('requestAddSongsToCustom', [window.app, 'addSongsToCustom']);

  Router.connect(window.ui.mediaLibraryPage, window.app.playingPlaylist, {
    'requestPlaySongs': 'switchToSources',
    'switchPlayingToIndex': 'switchToItem'
  });

  Router.connect(window.ui.mediaLibraryPage, window.app.playlists, {
    'deleteItemFromPlaylist': 'deleteItemFromPlaylist',
    'createPlaylist': 'createEmptyPlaylist',
    'copyPlaylist': 'copyPlaylist',
    'deletePlaylist': 'deletePlaylist',
    'renamePlaylist': 'renamePlaylist',
    'shufflePlaylist': 'shufflePlaylist',
    'switchPlaylist': 'switchPlaylist',
    'togglePlaylist': 'togglePlaylist',
    'movePlaylistItemRelative': 'moveItem',
  });

  Router.connect(window.ui.mediaLibraryPage, window.app, {
    'shareSong': 'shareSong',
  });

  //============== APP --> UI ===============

  window.app.router.when('requestSourceFromSong', function(song){
    return new FileAudioSource(window.musicLibrary.musicDB, song);
  });

  window.app.router.when('requestTargetPlaylist', [window.ui, 'getTargetPlaylist']);

  Router.connect(window.app.playingPlaylist, window.ui, {
    'playlistUpdated': 'setPlaylist',
    'becameSavable': 'setSavable',
    'becameNotSavable': 'setNotSavable',
    'songStateUpdated': 'setSongState',
    'requestCheckSave': 'userWantsSave',
    'requestCheckSaveAsNewOrUpdate': 'saveAsNewOrUpdate',
    'modeUpdated': 'updateMode'
  });

  Router.connect(window.app.playingPlaylist, window.ui.currentMusicPage.controls, {
    'cantGoNext': 'disableNext',
    'cantGoPrev': 'disablePrev',
    'canGoNext': 'enableNext',
    'canGoPrev': 'enablePrev'
  });

  window.app.audioPlayer.router.when('timeUpdated', function(curr, total){
    window.ui.setCurrentTime(curr);
    window.ui.setTotalTime(total);
  });

  window.app.playlists.router.when('playlistsUpdated', [window.ui, 'setPlaylists']);

  //============== Testing ===============

  window.tests = new Tests();
  //window.tests.testMainNavigation();
});
