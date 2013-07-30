var Playlists = function(){

  Router.route(this, [
    'selectPlaylist',
    'deletedPlaylist',
    'deletedItemFromPlaylist',
    'renamedPlaylist',
    'shuffledPlaylist',
    'addedToPlaylist',
    'movedItemInPlaylist',
    'createdPlaylist',
    'playlistsUpdated',
    'requestSourceFromSong',
  ]);

  this._load();
  this.playlistsUpdated(this.playlists);
}

Playlists.prototype = {
  name: "playlists",
  //============== API ===============
  createEmptyPlaylist: function(title){
    var playlist = new Playlist(title);
    var playlistId = this.nextPlaylistId;
    this.playlists[playlistId] = playlist;
    this.nextPlaylistId++;
    this.playlistsUpdated(this.playlists);
    this._save();
    this.createdPlaylist(playlist, playlistId);
    return playlistId;
  },
  savePlaylist: function(playlist, playlistId){
    var newPlaylist;

    if (playlistId === null)
      playlistId = this.createEmptyPlaylist(playlist.title);

    newPlaylist = this.playlists[playlistId];
    newPlaylist.list = Utils.copyArray(playlist.list);
    newPlaylist.title = playlist.title;
    this.playlistsUpdated(this.playlists); //TODO inefficient
    this._save();
    return playlistId;
  },
  copyPlaylist: function(title, srcPlaylistId){
    var playlistId = this.createEmptyPlaylist(title);
    this.playlists[playlistId].list = Utils.copyArray(this.playlists[srcPlaylistId].list);
    this._save();
  },
  deletePlaylist: function(playlistId){
    var playlist = this.playlists[playlistId];
    this.deletedPlaylist(playlistId);
    delete this.playlists[playlistId];
    this.playlistsUpdated(this.playlists);
    this._save();
  },
  addToPlaylist: function(playlistId, songs){
    var playlist = this.playlists[playlistId];
    songs = songs.map(function(song){ return this.requestSourceFromSong(song); }.bind(this));
    playlist.list.push.apply(playlist.list, songs);
    this.playlistsUpdated(this.playlists);
    this._save();
    this.addedToPlaylist(playlistId, playlist);
  },
  deleteItemFromPlaylist: function(playlistId, index){
    var playlist = this.playlists[playlistId];
    playlist.remove(index);
    this.deletedItemFromPlaylist(playlistId, index);
    this.playlistsUpdated(this.playlists);
    this._save();
  },
  renamePlaylist: function(playlistId, title){
    var playlist = this.playlists[playlistId];
    playlist.title = title;
    this.playlistsUpdated(this.playlists);
    this.renamedPlaylist(playlistId, title);
    this._save();
  },
  shufflePlaylist: function(playlistId){
    var playlist = this.playlists[playlistId];
    Utils.shuffleArray(playlist.list);
    this.playlistsUpdated(this.playlists);
    this.shuffledPlaylist(playlist, playlistId);
    this._save();
  },
  moveItem: function(playlistId, source, relativeSource, relativeDir){
    var playlist = this.playlists[playlistId];

    var sourceIndex = playlist.list.indexOf(source);
    playlist.remove(sourceIndex);

    var relativeSourceIndex = playlist.list.indexOf(relativeSource);

    if (relativeDir === 'above'){
      playlist.list.splice(relativeSourceIndex, 0, source);
    }
    else if (relativeDir === 'below'){
      playlist.list.splice(relativeSourceIndex+1, 0, source);
    }

    this.playlistsUpdated(this.playlists);
    this._save();
    this.movedItemInPlaylist(playlistId, source, relativeSource, relativeDir);
  },
  switchPlaylist: function(playlistId){
    this.selectPlaylist(this.playlists[playlistId], playlistId);
  },
  //============== helpers ===============
  _load: function(){
    this.playlists = {};
    if (window.localStorage.playlists){
      var serializedPlaylists = JSON.parse(window.localStorage.playlists);
      for (var playlistId in serializedPlaylists)
        this.playlists[playlistId] = Playlist.unserialize(serializedPlaylists[playlistId]);
      this.nextPlaylistId = JSON.parse(window.localStorage.nextPlaylistId);
    }
    else {
      this.nextPlaylistId = 0;
    }

  },
  _save: function(){
    var serializedPlaylists = {};
    for (var playlistId in this.playlists)
      serializedPlaylists[playlistId] = this.playlists[playlistId].serialize();
    window.localStorage.playlists = JSON.stringify(serializedPlaylists);
    window.localStorage.nextPlaylistId = JSON.stringify(this.nextPlaylistId);
  },
}
