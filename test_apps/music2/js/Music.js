
var Music = function() {

  this.playingPlaylist = new PlayingPlaylist();
  this.playlists = new Playlists();

  this.playlists.onselectPlaylist = this.playingPlaylist.switchToPlaylist.bind(this.playingPlaylist);
  this.playingPlaylist.onsavePlaylistToPlaylists = this.playlists.savePlaylist.bind(this.playlists);

  this.playlists.ondeletedPlaylist = this.playingPlaylist.deletedPlaylist.bind(this.playingPlaylist);
  this.playlists.onrenamedPlaylist = this.playingPlaylist.renamedPlaylist.bind(this.playingPlaylist);
  this.playlists.onshuffledPlaylist = this.playingPlaylist.shuffledPlaylist.bind(this.playingPlaylist);
  this.playlists.ondeletedItemFromPlaylist = this.playingPlaylist.deletedItemFromPlaylist.bind(this.playingPlaylist);
  this.playlists.onaddedToPlaylist = this.playingPlaylist.addedToPlaylist.bind(this.playingPlaylist);
  this.playlists.onmovedItemInPlaylist = this.playingPlaylist.movedItemInPlaylist.bind(this.playingPlaylist);

  this.audioPlayer = new AudioPlayer();

  this.playingPlaylist.onplaySong = this.audioPlayer.play.bind(this.audioPlayer);
  this.playingPlaylist.onpauseSong = this.audioPlayer.pause.bind(this.audioPlayer);
  this.playingPlaylist.onstopSong = this.audioPlayer.stop.bind(this.audioPlayer);

  this.audioPlayer.onisEnded = this.playingPlaylist.playNext.bind(this.playingPlaylist);

  Router.route(this, [
    'requestTargetPlaylist',
    'requestSourceFromSong',
  ]);

  this.playingPlaylist.onrequestSourceFromSong = this.requestSourceFromSong;
  this.playlists.onrequestSourceFromSong = this.requestSourceFromSong;

  this.playingPlaylist.onsave = this.playlists.savePlaylist.bind(this.playlists);
  this.playlists.oncreatedPlaylist = this.playingPlaylist.createdPlaylist.bind(this.playingPlaylist);
}

Music.prototype = {
  name: "music",
  addSongsToCustom: function(title, songs){
    var hasCurrent = this.playingPlaylist.playlist !== null;
    console.log(hasCurrent);
    this.requestTargetPlaylist(this.playlists.playlists, title, hasCurrent, function(choice){
      if (choice === 'new'){
        var playlistId = this.playlists.createEmptyPlaylist(title);
        this.playlists.addToPlaylist(playlistId, songs);

        if (!hasCurrent){
          this.playingPlaylist.switchToPlaylist(this.playlists.playlists[playlistId], playlistId);
        }
      }
      else if (choice === 'current'){
        this.playingPlaylist.enqueue(title, songs);
      }
      else if (choice !== 'cancel'){
        this.playlists.addToPlaylist(choice, songs);
      }
    }.bind(this));
  }
}

