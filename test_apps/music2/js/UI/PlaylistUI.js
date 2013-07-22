var PlaylistUI = function(currentPageUI, playlistDrawerUI){
  this.currentPage = currentPageUI;
  this.playlistDrawer = playlistDrawerUI;

  Utils.setupPassParent(this, 'playPrev');
  Utils.setupPassParent(this, 'playNext');
  Utils.setupPassParent(this, 'play');
  Utils.setupPassParent(this, 'pause');
  Utils.setupPassParent(this, 'requestSetTime');

  Utils.setupPassParent(this, 'deleteItemFromPlaylist');
  Utils.setupPassParent(this, 'switchToPlaylistItem');
  Utils.setupPassParent(this, 'movePlaylistItemRelative');

  Utils.setupPassParent(this, 'createPlaylist');
  Utils.setupPassParent(this, 'deletePlaylist');
  Utils.setupPassParent(this, 'renamePlaylist');
  Utils.setupPassParent(this, 'shufflePlaylist');
  Utils.setupPassParent(this, 'setCurrentPlaylist');
  Utils.setupPassParent(this, 'copyPlaylist');

  Utils.setupPassParent(this, 'appendAudioSourcesToPlaylist');

  Utils.setupPassParent(this, 'getPlaylists');

  this.currentPage.controls.onplayPrev = this.playPrev.bind(this);
  this.currentPage.controls.onplayNext = this.playNext.bind(this);
  this.currentPage.controls.onplay = this.play.bind(this);
  this.currentPage.controls.onpause = this.pause.bind(this);
  this.currentPage.controls.seekBar.onrequestSetTime = this.requestSetTime.bind(this);

  this.currentPage.playlist.ondeleteItemFromPlaylist = this.deleteItemFromPlaylist.bind(this);
  this.currentPage.playlist.onswitchToPlaylistItem = this.switchToPlaylistItem.bind(this);
  this.currentPage.playlist.onmovePlaylistItemRelative = this.movePlaylistItemRelative.bind(this);

  this.playlistDrawer.oncreatePlaylist = this.createPlaylist.bind(this);
  this.playlistDrawer.ondeletePlaylist = this.deletePlaylist.bind(this);
  this.playlistDrawer.onrenamePlaylist = this.renamePlaylist.bind(this);
  this.playlistDrawer.onshufflePlaylist = this.shufflePlaylist.bind(this);
  this.playlistDrawer.onswitchPlaylist = this.setCurrentPlaylist.bind(this);
  this.playlistDrawer.oncopyPlaylist = this.copyPlaylist.bind(this);

  this.playlistDrawer.playlist.ondeleteItemFromPlaylist = this.deleteItemFromPlaylist.bind(this);
  this.playlistDrawer.playlist.onswitchToPlaylistItem = this.switchToPlaylistItem.bind(this);
  this.playlistDrawer.playlist.onmovePlaylistItemRelative = this.movePlaylistItemRelative.bind(this);


  this.currentPlaylistId = null;
}

PlaylistUI.prototype = {
  name: 'playlistUI',
  setPaused: function(){
    this.currentPage.controls.setPaused();
    if (this.playlistDrawer.selectedPlaylistId === this.currentPlaylistId)
      this.playlistDrawer.setCurrentPlaylist(this.currentPlaylistId);
  },
  setPlaying: function(){
    this.currentPage.controls.setPlaying();
    if (this.playlistDrawer.selectedPlaylistId === this.currentPlaylistId)
      this.playlistDrawer.setCurrentPlaylist(this.currentPlaylistId);
  },
  setStopped: function(){
    this.currentPage.controls.seekBar.disable();
    if (this.playlistDrawer.selectedPlaylistId === this.currentPlaylistId)
      this.playlistDrawer.setCurrentPlaylist(this.currentPlaylistId);
  },
  setTotalTime: function(time){
    this.currentPage.controls.seekBar.setTotalTime(time);
  },
  setCurrentTime: function(time){
    this.currentPage.controls.seekBar.setCurrentTime(time);
  },
  refreshPlaylists: function(playlists){
    this.playlistDrawer.setPlaylists(playlists);
  },
  switchCurrentPlaylist: function(playlist, playlistId){
    this.currentPlaylistId = playlistId;
    this.currentPage.playlist.setPlaylist(playlist, playlistId);
    this.playlistDrawer.setCurrentPlaylist(playlistId);
    if (playlistId === null || playlist.list.length === 0){
      this.currentPage.controls.disable();
    }
    else {
      this.currentPage.controls.enable();
    }
    if (playlistId === null){
      this.currentPage.setTitle('');
    }
    else {
      this.currentPage.setTitle(playlist.title);
    }
  },
  refreshCurrentPlaylist: function(playlist, playlistId){
    this.currentPage.playlist.setPlaylist(playlist, playlistId);
    if (this.playlistDrawer.selectedPlaylistId === playlistId)
      this.playlistDrawer.setCurrentPlaylist(playlistId);
    if (playlist.list.length === 0){
      this.currentPage.controls.disable();
    }
    else {
      this.currentPage.controls.enable();
    }
    this.currentPage.setTitle(playlist.title);
  },
  setSong: function(song){
    this.currentPage.source.setInfo(song);
  },
  enqueueIntoCustomPlaylist: function(title, sources){
    var options = {};
    options['add to new playlist, ' + title] = '__empty';
    
    var playlists = this.getPlaylists();

    for (var playlistId in playlists){
      var playlist = playlists[playlistId];
      options['add to ' + playlist.title] = playlistId;
    }

    options['cancel'] = { 'value': '__cancel', 'default': true };

    Utils.select(options, function(choice){
      if (choice === '__cancel'){
        
      }
      else if (choice === '__empty'){
        var playlistId = this.createPlaylist(title);
        this.appendAudioSourcesToPlaylist(playlistId, sources);
      }
      else {
        this.appendAudioSourcesToPlaylist(choice, sources);
      }
    }.bind(this));
  }
}
