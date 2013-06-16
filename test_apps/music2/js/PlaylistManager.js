var PlaylistManager = function(currentPageUI, playlistDrawerUI){
  this.ui = currentPageUI;
  this.ui.playlists = playlistDrawerUI;

  this.audioPlayer = new AudioPlayer();

  this.playlists = {};
  
  this.loadPlaylists();

  this.currentPlaylistId = null;

  if (this.numPlaylists === 0){
    //this.createPlaylist("new playlist");
    this.ui.playlists.setPlaylists(this.playlists);
    this.setCurrentPlaylist(null);
  }
  else {
    this.ui.playlists.setPlaylists(this.playlists);
    for (var id in this.playlists){
      this.setCurrentPlaylist(id);
      break;
    }
  }

  this.ui.controls.onplayPrev = this.playPrev.bind(this);
  this.ui.controls.onplayNext = this.playNext.bind(this);
  this.ui.controls.onplay = this.play.bind(this);
  this.ui.controls.onpause = this.pause.bind(this);
  this.ui.controls.seekBar.onrequestSetTime = this.setTime.bind(this);

  this.ui.playlist.ondeleteItemFromPlaylist = this.deleteItemFromPlaylist.bind(this);
  this.ui.playlist.onswitchToPlaylistItem = this.switchToPlaylistItem.bind(this);
  this.ui.playlist.onmovePlaylistItemRelative = this.movePlaylistItemRelative.bind(this);

  this.ui.playlists.oncreatePlaylist = this.createPlaylist.bind(this);
  this.ui.playlists.ondeletePlaylist = this.deletePlaylist.bind(this);
  this.ui.playlists.onrenamePlaylist = this.renamePlaylist.bind(this);
  this.ui.playlists.onswitchPlaylist = this.setCurrentPlaylist.bind(this);

  this.ui.playlists.playlist.ondeleteItemFromPlaylist = this.deleteItemFromPlaylist.bind(this);
  this.ui.playlists.playlist.onswitchToPlaylistItem = this.switchToPlaylistItem.bind(this);
  this.ui.playlists.playlist.onmovePlaylistItemRelative = this.movePlaylistItemRelative.bind(this);

  this.audioPlayer.onisEnded = this.currentEnded.bind(this);
  this.audioPlayer.onisPaused = this.ui.controls.setPaused.bind(this.ui.controls);
  this.audioPlayer.onisPlaying = this.ui.controls.setPlaying.bind(this.ui.controls);
  this.audioPlayer.onisStopped = this.ui.controls.seekBar.disable.bind(this.ui.controls.seekBar);
  this.audioPlayer.onsetTotalTime = this.ui.controls.seekBar.setTotalTime.bind(this.ui.controls.seekBar);
  this.audioPlayer.onsetCurrentTime = this.ui.controls.seekBar.setCurrentTime.bind(this.ui.controls.seekBar);

  this.ui.source.setInfo(null);
  this.ui.controls.seekBar.disable();
}

PlaylistManager.prototype = {
  appendAudioSourcesToCurrent: function(title, sources){
    if (this.currentPlaylistId === null){
      var playlistId = this.createPlaylist(title);
      if (this.currentPlaylistId === null){
        this.setCurrentPlaylist(playlistId);
      }
    }
    var playlist = this.playlists[this.currentPlaylistId];
    if (playlist.list.length === 0)
      this.ui.controls.enable();
    if (playlist.temporary){
      playlist.temporary = false;
      this.ui.playlists.setPlaylists(this.playlists);
      this.ui.playlists.setCurrentPlaylist(this.currentPlaylistId, 'stop');
    }
    for (var i = 0; i < sources.length; i++){
      playlist.appendAudioSource(sources[i]);
    }
    this.ui.playlist.setPlaylist(playlist, this.currentPlaylistId);
    this.savePlaylists();
  },
  createTemporaryPlaylistFromSources: function(title, sources){
    var playlistId = this.createPlaylist(title, true);
    this.setCurrentPlaylist(playlistId);

    var playlist = this.playlists[this.currentPlaylistId];
    for (var i = 0; i < sources.length; i++){
      playlist.appendAudioSource(sources[i]);
    }
    if (sources.length > 0){
      this.ui.controls.enable();
    }
    this.ui.playlist.setPlaylist(playlist, this.currentPlaylistId);
    this.ui.playlists.setCurrentPlaylist(this.currentPlaylistId, 'stop');
    this.play();
  },
  stop: function(){
    this.ui.source.setInfo(null);
    if (this.currentPlaylistId === null)
      return;
    var playlist = this.playlists[this.currentPlaylistId];
    playlist.stop(this.audioPlayer);
    this.ui.playlists.setCurrentPlaylist(this.currentPlaylistId, 'stop');
  },
  togglePlaying: function(){
    if (this.currentPlaylistId === null)
      return;
    var playlist = this.playlists[this.currentPlaylistId];
    if (playlist.getCurrentSource().state === 'play')
      this.pause();
    else
      this.play();
  },
  play: function(){
    if (this.currentPlaylistId === null)
      return;
    var playlist = this.playlists[this.currentPlaylistId];
    playlist.play(this.audioPlayer);
    this.ui.source.setInfo(playlist.getCurrentSource());
    this.ui.playlist.setPlaylist(playlist, this.currentPlaylistId);
    this.ui.playlists.setCurrentPlaylist(this.currentPlaylistId, 'play');
  },
  pause: function(){
    if (this.currentPlaylistId === null)
      return;
    var playlist = this.playlists[this.currentPlaylistId];
    playlist.pause(this.audioPlayer);
    this.ui.playlist.setPlaylist(playlist, this.currentPlaylistId);
    this.ui.playlists.setCurrentPlaylist(this.currentPlaylistId, 'pause');
  },
  setTime: function(time){
    this.audioPlayer.setTime(time);
  },
  playNext: function(){
    if (this.currentPlaylistId === null)
      return;
    var playlist = this.playlists[this.currentPlaylistId];
    this.stop();
    playlist.currentIndex += 1;
    if (!playlist.atEnd()){
      this.play();
    }
    else {
      this.ui.controls.setPaused();
    }
    this.ui.playlist.setPlaylist(playlist, this.currentPlaylistId);
  },
  playPrev: function(){
    if (this.currentPlaylistId === null)
      return;
    var playlist = this.playlists[this.currentPlaylistId];
    this.stop();
    playlist.currentIndex -= 1;
    if (!playlist.atBegin()){
      this.play();
    }
    this.ui.playlist.setPlaylist(playlist, this.currentPlaylistId);
  },
  currentEnded: function(){
    this.playNext();
  },
  deleteItemFromPlaylist: function(source, playlistId){
    var playlist = this.playlists[playlistId];
    if (this.currentPlaylistId !== null &&
        playlist === this.currentPlaylistId &&
        source === playlist.getCurrentSource()
    ){
      var wasPlaying = source.state === 'play';
      this.playNext();
      if (!wasPlaying){
        this.pause();
      }
    }
    playlist.deleteSource(source);
    if (playlist.list.length === 0){
      this.ui.controls.disable();
    }
    this.ui.source.setInfo(playlist.getCurrentSource());
    this.ui.playlist.setPlaylist(playlist, this.currentPlaylistId);
    this.savePlaylists();
  },
  movePlaylistItemRelative: function(playlist, source, relativeSource, relativeDir){
    var setIndex = playlist.getCurrentSource() === source;
    playlist.deleteSource(source);
    playlist.insertSourceRelative(source, relativeSource, relativeDir);
    if (setIndex){
      playlist.currentIndex = playlist.list.indexOf(source);
    }

    if (this.playlists[this.currentPlaylistId] === playlist){
      this.ui.playlist.setPlaylist(playlist, this.currentPlaylistId);
    }
    this.ui.playlists.setPlaylists(this.playlists);
    this.savePlaylists();

  },
  switchToPlaylistItem: function(source, playlistId){
    if (playlistId === this.currentPlaylistId){
      var currentPlaylist = this.playlists[this.currentPlaylistId];
      if(source === currentPlaylist.getCurrentSource()){
        this.togglePlaying();
      }
      else {
        this.stop();
        var currentPlaylist = this.playlists[this.currentPlaylistId];
        currentPlaylist.setCurrentSource(source);
        this.play();
      }
      this.ui.playlists.playlist.setPlaylist(currentPlaylist, this.currentPlaylistId);
    }
    else {
      this.stop();
      this.setCurrentPlaylist(playlistId);
      var currentPlaylist = this.playlists[this.currentPlaylistId];
      currentPlaylist.setCurrentSource(source);
      this.play();
      this.ui.playlists.playlist.setPlaylist(currentPlaylist, this.currentPlaylistId);
    }
  },
  loadPlaylists: function(){
    this.playlists = {}; 
    this.nextPlaylistId = 0;
    this.numPlaylists = 0;
    if (window.localStorage.playlists === undefined)
      return;
    var serializedPlaylists = JSON.parse(window.localStorage.playlists);
    for (var id in serializedPlaylists){
      this.numPlaylists += 1;
      this.playlists[id] = Playlist.unserialize(serializedPlaylists[id]);
    }
    this.nextPlaylistId = parseInt(window.localStorage.nextPlaylistId);
  },
  createPlaylist: function(title, temporary){
    if (!temporary)
      temporary = false;
    var playlist = new Playlist(title, temporary);
    var playlistId = this.nextPlaylistId
    this.playlists[playlistId] = playlist;
    this.nextPlaylistId++;
    this.numPlaylists += 1;
    this.ui.playlists.setPlaylists(this.playlists);
    if (!playlist.temporary)
      this.savePlaylists();
    if (this.numPlaylists === 1){
      this.setCurrentPlaylist(playlistId);
    }
    return playlistId;
  },
  deletePlaylist: function(playlistId){
    var playlist = this.playlists[playlistId];
    if (this.currentPlaylistId !== null &&
        playlist === this.playlists[this.currentPlaylistId]
    ){
      this.setCurrentPlaylist(null);
    }
    delete this.playlists[playlistId];
    this.numPlaylists -= 1;
    this.ui.playlists.setPlaylists(this.playlists);
    this.savePlaylists();
  },
  renamePlaylist: function(playlistId, title){
    var playlist = this.playlists[playlistId];
    playlist.title = title;
    if (playlist.temporary){
      playlist.temporary = false;
    }

    this.ui.playlists.setPlaylists(this.playlists);
    this.savePlaylists();
  },
  setCurrentPlaylist: function(playlistId){
    this.stop();
    this.currentPlaylistId = playlistId;
    var currentPlaylist = this.playlists[this.currentPlaylistId];
    this.ui.playlist.setPlaylist(currentPlaylist, this.currentPlaylistId);
    this.ui.playlists.setCurrentPlaylist(playlistId);
    if (playlistId === null || currentPlaylist.list.length === 0){
      this.ui.controls.disable();
    }
    else {
      this.ui.controls.enable();
    }
    if (playlistId === null){
      this.ui.setTitle('');
    }
    else {
      this.ui.setTitle(currentPlaylist.title);
    }
  },
  savePlaylists: function(){
    var serializedPlaylists = {};
    for (var id in this.playlists){
      var playlist = this.playlists[id];
      if (playlist.temporary)
        continue;
      serializedPlaylists[id] = playlist.serialize();
    }
    window.localStorage.playlists = JSON.stringify(serializedPlaylists);
    window.localStorage.nextPlaylistId = this.nextPlaylistId;
  }
}
