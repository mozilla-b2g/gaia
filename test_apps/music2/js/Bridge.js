window.addEventListener('load', function bridge(){

  Router.logRouting = true;
  window.musicLibrary = new MusicLibrary();
  window.ui = new MusicUI();
  window.app = new Music(); 

  //============== MusicLibrary --> UI ===============

  window.musicLibrary.onloading = window.ui.mediaLibraryPage.setLoading.bind(window.ui.mediaLibraryPage);
  window.musicLibrary.ondoneLoading = window.ui.mediaLibraryPage.setDoneLoading.bind(window.ui.mediaLibraryPage)
  window.musicLibrary.onsongRemoved = window.ui.mediaLibraryPage.notifySongRemoved.bind(window.ui.mediaLibraryPage);
  window.musicLibrary.onsongFound = window.ui.mediaLibraryPage.notifySongFound.bind(window.ui.mediaLibraryPage);
  window.musicLibrary.onmusicChanged = window.ui.musicChanged.bind(window.ui);

  //============== UI --> APP ===============


  window.ui.onrequestAddSongs = window.app.playingPlaylist.enqueue.bind(window.app.playingPlaylist);

  window.ui.currentMusicPage.controls.onplay =                   window.app.playingPlaylist.play.bind(window.app.playingPlaylist);
  window.ui.currentMusicPage.controls.onpause =                  window.app.playingPlaylist.pause.bind(window.app.playingPlaylist);
  window.ui.currentMusicPage.controls.onplayPrev =               window.app.playingPlaylist.playPrev.bind(window.app.playingPlaylist);
  window.ui.currentMusicPage.controls.onplayNext =               window.app.playingPlaylist.playNext.bind(window.app.playingPlaylist);
  window.ui.currentMusicPage.controls.seekBar.onrequestSetTime = window.app.audioPlayer.setTime.bind(window.app.audioPlayer);

  window.ui.currentMusicPage.playlist.ondeleteItemFromPlayingPlaylist = window.app.playingPlaylist.deleteItem.bind(window.app.playingPlaylist);
  window.ui.currentMusicPage.playlist.onswitchToPlaylistItem =          window.app.playingPlaylist.switchToItem.bind(window.app.playingPlaylist);
  window.ui.currentMusicPage.playlist.onmovePlaylistItemRelative =      window.app.playingPlaylist.moveItem.bind(window.app.playingPlaylist);

  window.ui.currentMusicPage.options.onsavePlaylist =    window.app.playingPlaylist.savePlaylist.bind(window.app.playingPlaylist);
  window.ui.currentMusicPage.options.onclearPlaylist =   window.app.playingPlaylist.clearPlaylist.bind(window.app.playingPlaylist);
  window.ui.currentMusicPage.options.onshufflePlaylist = window.app.playingPlaylist.shufflePlaylist.bind(window.app.playingPlaylist);
  window.ui.currentMusicPage.options.onrenamePlaylist =  window.app.playingPlaylist.renamePlaylist.bind(window.app.playingPlaylist);
  window.ui.currentMusicPage.options.onplaylistify =     window.app.playingPlaylist.simpleToPlaylist.bind(window.app.playingPlaylist);
  window.ui.currentMusicPage.options.ondeletePlaylist =  window.app.playingPlaylist.deletePlaylist.bind(window.app.playingPlaylist);

  window.ui.mediaLibraryPage.onrequestAddSongsToCustom =  window.app.addSongsToCustom.bind(window.app);
  window.ui.mediaLibraryPage.onrequestPlaySongs =         window.app.playingPlaylist.switchToSources.bind(window.app.playingPlaylist);
  window.ui.mediaLibraryPage.onswitchPlayingToIndex =     window.app.playingPlaylist.switchToItem.bind(window.app.playingPlaylist);
  window.ui.mediaLibraryPage.ondeleteItemFromPlaylist =   window.app.playlists.deleteItemFromPlaylist.bind(window.app.playlists);
  window.ui.mediaLibraryPage.oncreatePlaylist =           window.app.playlists.createEmptyPlaylist.bind(window.app.playlists);
  window.ui.mediaLibraryPage.oncopyPlaylist =             window.app.playlists.copyPlaylist.bind(window.app.playlists);
  window.ui.mediaLibraryPage.ondeletePlaylist =           window.app.playlists.deletePlaylist.bind(window.app.playlists);
  window.ui.mediaLibraryPage.onrenamePlaylist =           window.app.playlists.renamePlaylist.bind(window.app.playlists);
  window.ui.mediaLibraryPage.onshufflePlaylist =          window.app.playlists.shufflePlaylist.bind(window.app.playlists);
  window.ui.mediaLibraryPage.onswitchPlaylist =           window.app.playlists.switchPlaylist.bind(window.app.playlists);
  window.ui.mediaLibraryPage.onmovePlaylistItemRelative = window.app.playlists.moveItem.bind(window.app.playlists);


  //============== APP --> UI ===============

  window.app.onrequestSourceFromSong = function(song){ return new FileAudioSource(window.musicLibrary.musicDB, song); };
  window.app.onrequestTargetPlaylist = window.ui.getTargetPlaylist.bind(window.ui);

  window.app.playingPlaylist.onplaylistUpdated =                window.ui.setPlaylist.bind(window.ui);
  window.app.playingPlaylist.onbecameSavable =                  window.ui.setSavable.bind(window.ui);
  window.app.playingPlaylist.onbecameNotSavable =               window.ui.setNotSavable.bind(window.ui);
  window.app.playingPlaylist.onsongStateUpdated =               window.ui.setSongState.bind(window.ui);
  window.app.playingPlaylist.onrequestCheckSave =               window.ui.userWantsSave.bind(window.ui);
  window.app.playingPlaylist.onrequestCheckSaveAsNewOrUpdate =  window.ui.saveAsNewOrUpdate.bind(window.ui);
  window.app.playingPlaylist.oncantGoNext =                     window.ui.currentMusicPage.controls.disableNext.bind(window.ui.currentMusicPage.controls);
  window.app.playingPlaylist.oncantGoPrev =                     window.ui.currentMusicPage.controls.disablePrev.bind(window.ui.currentMusicPage.controls); 
  window.app.playingPlaylist.oncanGoNext =                      window.ui.currentMusicPage.controls.enableNext.bind(window.ui.currentMusicPage.controls);
  window.app.playingPlaylist.oncanGoPrev =                      window.ui.currentMusicPage.controls.enablePrev.bind(window.ui.currentMusicPage.controls); 
  window.app.playingPlaylist.onmodeUpdated =                    window.ui.updateMode.bind(window.ui);

  window.app.audioPlayer.ontimeUpdated = function(curr, total){
    window.ui.setCurrentTime(curr);
    window.ui.setTotalTime(total);
  }

  window.app.playlists.onplaylistsUpdated = window.ui.setPlaylists.bind(window.ui);

  //============== Routing monitoring ===============

  var monitor = new RouterMonitor("http://localhost:55234");

  //============== Testing ===============

  window.tests = new Tests();
  //window.tests.gotoFirstPlaylist();
  //window.tests.createPlaylist();
  //window.tests.gotoArtist();
  //window.tests.gotoAllSongs();
  //window.tests.performSearch();
  //window.tests.gotoAlbum();
  //window.tests.gotoPlaylists();
  //window.tests.testRemovePlaylist();
  //window.tests.testRemoveFromPlaylist();
  //window.tests.testRemoveMultipleFromPlaylist();
});
