var MusicUI = function(){
  Utils.loadDomIds(this, [
      'toggleCurrentMusicPageView',
  ]);

  this.router = new Router(this);
  this.router.declareRoutes([
    'requestAddSongs'
  ]);

  this.viewVisibility = new ViewVisibility();
  this.viewEvents = new ViewEvents();
  this.currentMusicPage = new CurrentMusicPage();
  this.mediaLibraryPage = new MediaLibraryPage();

  this.fullRefresh = false;

  this._watchImgsForErrors();
  this._setupEventViewEvents();

  this.currentPlaylistUpdateListeners = [];
  this.playlistsUpdateListeners = [];
  this.playlistUpdateListeners = {};

  this.currentMusicPage.source.router.when('hideCurrentSourceView', function(){
    this.dom.toggleCurrentMusicPageView.classList.add('hidden');
    if (!this.dom.toggleCurrentMusicPageView.classList.contains('switchSong')){
      this.viewVisibility.toggleCurrentMusicPageView();
    }
  }.bind(this));

  this.viewEvents.router.when('dragCurrentMusicPage', function(y){
    var percent = 100*y/window.innerHeight;
    this.viewVisibility.setPartialCurrentMusicPage(percent);
  }.bind(this));

  this.viewEvents.router.when('startDragCurrentMusicPage', [this.viewVisibility, 'startDragCurrentMusicPage']);
  this.viewEvents.router.when('snapPositionCurrentMusicPage', [this.viewVisibility, 'snapPositionCurrentMusicPage']);

  this.currentMusicPage.source.router.when('showCurrentSourceView', function(){
    this.dom.toggleCurrentMusicPageView.classList.remove('hidden');
  }.bind(this));

  this.mediaLibraryPage.router.when('requestAddSongs', function(title, songs){
    this.router.route('requestAddSongs')(title, songs);
    this.currentMusicPage.controls.nowPlaying.temporarilyShowText('added ' + title, 1000);
  }.bind(this));

  this.mediaLibraryPage.router.when('requestFullRefresh', [this, '_setFullRefresh']);

  this.currentMusicPage.options.router.when('setEdit', [this, '_setEdit']);

  this.mediaLibraryPage.router.when('getPlaylists', function(){
    return this.playlists;
  }.bind(this), { 'module': this, 'name': 'getPlaylists' });

  this.mediaLibraryPage.router.when('getPlaylist', function(){
    return {
      playlist: this.currentPlaylist,
      playlistId: this.currentPlaylistId
    }
  }.bind(this), { 'module': this, 'name': 'getPlaylist' });

  this.mediaLibraryPage.router.when('registerPlaylistsUpdateListener', function(fn){
    this.playlistsUpdateListeners.push(fn);
  }.bind(this));
  this.mediaLibraryPage.router.when('registerCurrentPlaylistUpdateListener', function(fn){
    this.currentPlaylistUpdateListeners.push(fn);
  }.bind(this));
  this.mediaLibraryPage.router.when('registerPlaylistUpdateListener', function(playlistId, fn){
    if (this.playlistUpdateListeners[playlistId] === undefined)
      this.playlistUpdateListeners[playlistId] = [];
    this.playlistUpdateListeners[playlistId].push(fn);
  }.bind(this));

}

MusicUI.prototype = {
  name: "MusicUI",
  //============== API ===============

  setPlaylist: function(playlist, playlistId){
    this.currentMusicPage.controls.nowPlaying.show();
    this.currentMusicPage.playlist.setPlaylist(playlist, this.mode);
    this.currentMusicPage.setTitle(playlist.title);
    this.currentMusicPage.options.setPlaylistId(playlistId);

    this.currentMusicPage.controls.nowPlaying.show();
    if (playlist.list.length === 0 && this.mode === 'simple'){
      this.currentMusicPage.controls.nowPlaying.hide();
      this.viewVisibility.showSelectMusicPage();
    }
    else {
      if (playlist.list.length === 0)
        this.currentMusicPage.source.setInfo(null);
      this.currentMusicPage.controls.nowPlaying.show();
    }
    if (this.currentPlaylist !== playlist){
      this.viewVisibility.showCurrentMusicPlaylistView();
    }
    this.currentPlaylistUpdateListeners.forEach(function(fn){ fn(playlist, playlistId); });
    if (this.playlistUpdateListeners[playlistId])
      this.playlistUpdateListeners[playlistId].forEach(function(fn){ fn(playlist, playlistId); });
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

    if (!this.fullRefresh){
      this.mediaLibraryPage.userWantRefresh(numberCreated, numberDeleted, function wantRefresh(){
        this.mediaLibraryPage.refresh();
      }.bind(this));
    }
    else {
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
    this.playlistsUpdateListeners.forEach(function(fn){ fn(this.playlists); });;
    for (var playlistId in playlists){
      var playlist = playlists[playlistId];
      if (this.playlistUpdateListeners[playlistId])
        this.playlistUpdateListeners[playlistId].forEach(function(fn){ fn(playlist, playlistId); });
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
    if (hasCurrent && (this.mode === 'playlist' || this.mode === 'edit'))
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
  _setFullRefresh: function(){
    this.fullRefresh = true;
  },
  _setEdit: function(isEdit){
    if (isEdit)
      this.updateMode('edit')
    else
      this.updateMode('playlist')
  },
  _setupEventViewEvents: function() {
    var eventViewTable = {
      'gotoCurrentMusicPage': 'showCurrentMusicPage',
      'gotoSelectMusicPage': 'showSelectMusicPage',

      'toggleCurrentMusicPageView': 'toggleCurrentMusicPageView'
    }

    for (var event in eventViewTable){
      this.viewEvents.router.when(event, [this.viewVisibility, eventViewTable[event]]);
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
