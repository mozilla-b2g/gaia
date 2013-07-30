var MusicUI = function(){
  Utils.loadDomIds(this, [
      'toggleCurrentMusicPageView',
  ]);


  this.viewVisibility = new ViewVisibility();
  this.viewEvents = new ViewEvents();
  this.currentMusicPage = new CurrentMusicPage();
  this.mediaLibraryPage = new MediaLibraryPage();

  this._watchImgsForErrors();
  this._setupEventViewEvents();

  this.currentPlaylistUpdateListener = null;
  this.playlistsUpdateListener = null;
  this.playlistUpdateListeners = {};

  this.showedTapPlaylistToUnselect = false;

  this.currentMusicPage.source.onhideCurrentSourceView = function(){
    this.dom.toggleCurrentMusicPageView.classList.add('hidden');
    if (!this.dom.toggleCurrentMusicPageView.classList.contains('switchSong')){
      this.viewVisibility.toggleCurrentMusicPageView();
    }
  }.bind(this);

  this.currentMusicPage.source.onshowCurrentSourceView = function(){
    this.dom.toggleCurrentMusicPageView.classList.remove('hidden');
  }.bind(this);

  Router.route(this, 'requestAddSongs');
  this.mediaLibraryPage.onrequestAddSongs = function(title, songs){
    this.requestAddSongs(title, songs);
    this.currentMusicPage.controls.nowPlaying.temporarilyShowText('added ' + title, 1000);
  }.bind(this);

  this.mediaLibraryPage.ongetPlaylists = function(){
    return this.playlists;
  }.bind(this);

  this.mediaLibraryPage.ongetPlaylist = function(){
    return {
      playlist: this.currentPlaylist,
      playlistId: this.currentPlaylistId
    }
  }.bind(this);

  this.mediaLibraryPage.onregisterPlaylistsUpdateListener = function(fn){
    this.playlistsUpdateListener = fn;
  }.bind(this);
  this.mediaLibraryPage.onregisterCurrentPlaylistUpdateListener = function(fn){
    this.currentPlaylistUpdateListener = fn;
  }.bind(this);
  this.mediaLibraryPage.onregisterPlaylistUpdateListener = function(playlistId, fn){
    this.playlistUpdateListeners[playlistId] = fn;
  }.bind(this);

}

MusicUI.prototype = {
  name: "MusicUI",
  //============== API ===============
  setPlaylist: function(playlist, playlistId){
    this.currentMusicPage.controls.nowPlaying.show();
    this.currentMusicPage.playlist.setPlaylist(playlist, this.mode);
    this.currentMusicPage.setTitle(playlist.title);
    if (playlist.list.length > 0){
      this.currentMusicPage.controls.nowPlaying.show();
    }
    else {
      this.currentMusicPage.controls.nowPlaying.hide();
      this.viewVisibility.showSelectMusicPage();
    }
    if (this.currentPlaylist !== playlist){
      this.viewVisibility.showCurrentMusicPlaylistView();
      if (playlistId !== null && !this.showedTapPlaylistToUnselect){
        this.mediaLibraryPage.notifications.alert('tap playlist to unselect<br>browse music to add songs', 4000);
        this.showedTapPlaylistToUnselect = true;
      }
    }
    if (this.currentPlaylistUpdateListener)
      this.currentPlaylistUpdateListener(playlist, playlistId);
    if (this.playlistUpdateListeners[playlistId])
      this.playlistUpdateListeners[playlistId](playlist);
    this.currentPlaylist = playlist;
    this.currentPlaylistId = playlistId;
  },
  updateMode: function(mode){
    this.mode = mode;
    this.mediaLibraryPage.updateMode(mode);
    this.currentMusicPage.playlist.updateMode(mode);
    this.currentMusicPage.options.updateMode(mode);
  },
  musicChanged: function(numberCreated, numberDeleted){
    if (window.localStorage.hasBeenLaunched){
      this.mediaLibraryPage.userWantRefresh(numberCreated, numberDeleted, function wantRefresh(){
        this.mediaLibraryPage.refresh();
      });
    }
    else {
      window.localStorage.hasBeenLaunched = true;
      this.mediaLibraryPage.refresh();
    }
  },
  setSongState: function(song, index, state, dontUpdateInfo){
    if (dontUpdateInfo !== true)
      this.currentMusicPage.source.setInfo(song, state);
    if (state === 'stopped'){
      this.currentMusicPage.controls.setPaused();
      this.currentMusicPage.controls.seekBar.disable();
    }
    else if (state === 'paused'){
      this.currentMusicPage.controls.setPaused();
      this.currentMusicPage.controls.seekBar.enable();
    }
    else if (state === 'playing'){
      this.currentMusicPage.controls.setPlaying();
      this.currentMusicPage.controls.seekBar.enable();
    }
    this.currentMusicPage.playlist.setSongState(index, state);
  },
  setSavable: function(){
    this.currentMusicPage.options.showSave();
  },
  setNotSavable: function(){
    this.currentMusicPage.options.hideSave();
  },
  setCurrentTime: function(seconds){
    this.currentMusicPage.controls.seekBar.setCurrentTime(seconds);
  },
  setTotalTime: function(seconds){
    this.currentMusicPage.controls.seekBar.setTotalTime(seconds);
  },
  setPlaylists: function(playlists){
    this.playlists = playlists;
    if (this.playlistsUpdateListener){
      this.playlistsUpdateListener(this.playlists);
    }
    for (var playlistId in playlists){
      var playlist = playlists[playlistId];
      if (this.playlistUpdateListeners[playlistId])
        this.playlistUpdateListeners[playlistId](playlist);
    }
  },
  saveAsNewOrUpdate: function(saveAsNew, saveAsUpdate, cancel, allowCancel){
    var options ={
      'update original playlist': 'update',
      'create new playlist': 'new'
    };

    if (allowCancel)
      options['cancel'] = { 'value': '__cancel', 'default': true };

    Utils.select(options, function(choice){
      var title;
      if (choice === '__cancel'){
        cancel();
      }
      else if (choice === 'update'){
        saveAsUpdate();
      }
      else if (choice === 'new'){
        var title = prompt("Playlist Name:");
        if (title !== null && title !== '')
          saveAsNew(title);
        else
          cancel();
      }
    }.bind(this));
  },
  userWantsSave: function(yes, no, cancel){
    var options ={
      'save modifications to current playlist': 'yes',
      'don\'t save modifications to current playlist': 'no'
    };

    options['cancel'] = { 'value': '__cancel', 'default': true };

    Utils.select(options, function(choice){
      var title;
      if (choice === '__cancel'){
        cancel();
      }
      else if (choice === 'yes'){
        yes();
      }
      else if (choice === 'no'){
        no();
      }
    }.bind(this));
  },
  getTargetPlaylist: function(playlists, newPlaylistTitle, hasCurrent, done){
    var options = { };
    if (hasCurrent && this.mode === 'playlist')
      options['add to current playlist'] = 'current';
    options['create playlist "' + newPlaylistTitle + '"'] = 'new';
    for (playlistId in playlists){
      var playlist = playlists[playlistId];
      options['add to playlist: ' + playlist.title] = playlistId;
    }
    options['cancel'] = { 'value': 'cancel', 'default': true };
    Utils.select(options, done);

  },
  //============== helpers ===============
  _setupEventViewEvents: function() {
    var eventViewTable = {
      'ongotoCurrentMusicPage': 'showCurrentMusicPage',
      'ongotoSelectMusicPage': 'showSelectMusicPage',

      'ontoggleCurrentMusicPageView': 'toggleCurrentMusicPageView'
    }

    for (var event in eventViewTable){
      this.viewEvents[event] = this.viewVisibility[eventViewTable[event]].bind(this.viewVisibility);
    }
  },
  _watchImgsForErrors: function(){
    var imgs = document.getElementsByTagName('img');
    for (var i = 0; i < imgs.length; i++){
      var img = imgs[i];
      (function(img){
        img.onerror = function(){
          img.src = '';
        };
      })(img);
    }
  }
}
