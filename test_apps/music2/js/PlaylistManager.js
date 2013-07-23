var PlaylistManager = function(currentPageUI, playlistDrawerUI){

  this.ui = new PlaylistUI(currentPageUI, playlistDrawerUI);

  this.audioPlayer = new AudioPlayer();

  this.playlists = {};
  
  this.storage = new PlaylistStorage();
  this.storage.load(this);

  this.currentPlaylistId = null;

  if (this.numPlaylists === 0){
    this.ui.refreshPlaylists(this.playlists);
    this.setCurrentPlaylist(null);
  }
  else {
    this.ui.refreshPlaylists(this.playlists);
    for (var id in this.playlists){
      this.setCurrentPlaylist(id);
      break;
    }
  }

  this.ui.onplayPrev = this.playPrev.bind(this);
  this.ui.onplayNext = this.playNext.bind(this);
  this.ui.onplay = this.play.bind(this);
  this.ui.onpause = this.pause.bind(this);
  this.ui.onrequestSetTime = this.setTime.bind(this);

  this.ui.ondeleteItemFromPlaylist = this.deleteItemFromPlaylist.bind(this);
  this.ui.onswitchToPlaylistItem = this.switchToPlaylistItem.bind(this);
  this.ui.onmovePlaylistItemRelative = this.movePlaylistItemRelative.bind(this);

  this.ui.oncreatePlaylist = this.createPlaylist.bind(this);
  this.ui.ondeletePlaylist = this.deletePlaylist.bind(this);
  this.ui.onrenamePlaylist = this.renamePlaylist.bind(this);
  this.ui.onshufflePlaylist = this.shufflePlaylist.bind(this);
  this.ui.onsetCurrentPlaylist = this.setCurrentPlaylist.bind(this);
  this.ui.oncopyPlaylist = this.copyPlaylist.bind(this);
  this.ui.onappendAudioSourcesToPlaylist = this.appendAudioSourcesToPlaylist.bind(this);

  this.ui.ongetPlaylists = function(){ return this.playlists; }.bind(this);

  this.audioPlayer.onisEnded = this.currentEnded.bind(this);

  this.audioPlayer.onisPaused = this.ui.setPaused.bind(this.ui);
  this.audioPlayer.onisPlaying = this.ui.setPlaying.bind(this.ui);
  this.audioPlayer.onisStopped = this.ui.setStopped.bind(this.ui);
  this.audioPlayer.onsetTotalTime = this.ui.setTotalTime.bind(this.ui);
  this.audioPlayer.onsetCurrentTime = this.ui.setCurrentTime.bind(this.ui);

  this.ui.setSong(null);
}

PlaylistManager.prototype = {
  appendAudioSourcesToCurrent: function(title, sources){
    if (this.currentPlaylistId === null){
      var playlistId = this.createPlaylist(title);
    }
    var playlist = this.playlists[this.currentPlaylistId];
    if (playlist.temporary){
      playlist.temporary = false;
      this.ui.refreshPlaylists(this.playlists);
    }
    for (var i = 0; i < sources.length; i++){
      playlist.appendAudioSource(sources[i]);
    }
    this.ui.refreshCurrentPlaylist(playlist, this.currentPlaylistId);
    this.savePlaylists();
  },
  appendAudioSourcesToPlaylist: function(playlistId, sources){
    if (playlistId === '' + this.currentPlaylistId){
      this.appendAudioSourcesToCurrent(null, sources);
    }
    else {
      var playlist = this.playlists[playlistId];
      if (playlist.temporary){
        playlist.temporary = false;
        this.ui.refreshPlaylists(this.playlists);
      }
      for (var i = 0; i < sources.length; i++){
        playlist.appendAudioSource(sources[i]);
      }
      this.savePlaylists();
    }
  },
  createTemporaryPlaylistFromSources: function(title, sources){
    var playlistId = this.createPlaylist(title, true);
    this.setCurrentPlaylist(playlistId);

    var playlist = this.playlists[this.currentPlaylistId];
    for (var i = 0; i < sources.length; i++){
      playlist.appendAudioSource(sources[i]);
    }
    this.ui.refreshCurrentPlaylist(playlist, this.currentPlaylistId);
    this.play();
  },
  stop: function(){
    this.ui.setSong(null);
    if (this.currentPlaylistId === null)
      return;
    var playlist = this.playlists[this.currentPlaylistId];
    playlist.stop(this.audioPlayer);
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
    this.ui.setSong(playlist.getCurrentSource());
    //this.ui.setPlaylistSongState(playlist.getCurrentSource());
    this.ui.refreshCurrentPlaylist(playlist, this.currentPlaylistId);
  },
  pause: function(){
    if (this.currentPlaylistId === null)
      return;
    var playlist = this.playlists[this.currentPlaylistId];
    playlist.pause(this.audioPlayer);
    this.ui.refreshCurrentPlaylist(playlist, this.currentPlaylistId);
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
      this.ui.setPaused();
    }
    this.ui.refreshCurrentPlaylist(playlist, this.currentPlaylistId);
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
    this.ui.refreshCurrentPlaylist(playlist, this.currentPlaylistId);
  },
  currentEnded: function(){
    this.playNext();
  },
  deleteItemFromPlaylist: function(source, playlistId){
    var playlist = this.playlists[playlistId];
    if (this.currentPlaylistId !== null &&
        playlistId === this.currentPlaylistId &&
        source === playlist.getCurrentSource()
    ){
      var wasPlaying = source.state === 'play';
      this.playNext();
      if (!wasPlaying){
        this.pause();
      }
    }
    playlist.deleteSource(source);
    this.ui.setSong(playlist.getCurrentSource());
    this.ui.refreshCurrentPlaylist(playlist, this.currentPlaylistId);
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
      this.ui.refreshCurrentPlaylist(playlist, this.currentPlaylistId);
    }
    this.ui.refreshPlaylists(this.playlists);
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
    }
    else {
      this.stop();
      this.setCurrentPlaylist(playlistId);
      var currentPlaylist = this.playlists[this.currentPlaylistId];
      currentPlaylist.setCurrentSource(source);
      this.play();
    }
  },
  copyPlaylist: function(title, srcPlaylistId){
    var playlistId = this.createPlaylist(title);
    this.playlists[playlistId].list = Utils.copyArray(this.playlists[srcPlaylistId].list);
    this.savePlaylists();
  },
  createPlaylist: function(title, temporary){
    if (!temporary)
      temporary = false;
    var playlist = new Playlist(title, temporary);
    var playlistId = this.nextPlaylistId
    this.playlists[playlistId] = playlist;
    this.nextPlaylistId++;
    this.numPlaylists += 1;
    this.ui.refreshPlaylists(this.playlists);
    if (!playlist.temporary)
      this.savePlaylists();
    if (this.numPlaylists === 1){
      this.setCurrentPlaylist(playlistId);
    }
    if (this.currentPlaylistId === null){
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
    this.ui.refreshPlaylists(this.playlists);
    this.savePlaylists();
  },
  renamePlaylist: function(playlistId, title){
    var playlist = this.playlists[playlistId];
    playlist.title = title;
    if (playlist.temporary){
      playlist.temporary = false;
    }

    this.ui.refreshPlaylists(this.playlists);
    if ('' + playlistId === '' + this.currentPlaylistId)
      this.ui.refreshCurrentPlaylist(playlist, playlistId);
    this.savePlaylists();
  },
  shufflePlaylist: function(playlistId){
    var playlist = this.playlists[playlistId];
    Utils.shuffleArray(playlist.list);
    this.ui.refreshPlaylists(this.playlists);
    if ('' + playlistId === '' + this.currentPlaylistId){
      this.ui.refreshCurrentPlaylist(playlist, playlistId);
    }
    this.savePlaylists();
  },
  setCurrentPlaylist: function(playlistId){
    this.stop();
    this.currentPlaylistId = playlistId;
    var currentPlaylist = this.playlists[this.currentPlaylistId];
    this.ui.switchCurrentPlaylist(currentPlaylist, this.currentPlaylistId);
  },
  savePlaylists: function(){
    this.storage.save(this.playlists, this.nextPlaylistId);
  }
}
