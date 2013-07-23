var PlaylistStorage = function(){

}

PlaylistStorage.prototype = {
  save: function(playlists, nextPlaylistId){
    var serializedPlaylists = {};
    for (var id in playlists){
      var playlist = playlists[id];
      if (playlist.temporary)
        continue;
      serializedPlaylists[id] = playlist.serialize();
    }
    window.localStorage.playlists = JSON.stringify(serializedPlaylists);
    window.localStorage.nextPlaylistId = nextPlaylistId;
  },
  load: function(playlistManager){
    playlistManager.playlists = {}; 
    playlistManager.nextPlaylistId = 0;
    playlistManager.numPlaylists = 0;
    if (window.localStorage.playlists === undefined)
      return;
    var serializedPlaylists = JSON.parse(window.localStorage.playlists);
    for (var id in serializedPlaylists){
      playlistManager.numPlaylists += 1;
      playlistManager.playlists[id] = Playlist.unserialize(serializedPlaylists[id]);
    }
    playlistManager.nextPlaylistId = parseInt(window.localStorage.nextPlaylistId);
  }
}

