'use strict';

var Music = function() {

  this.playingPlaylist = new PlayingPlaylist();
  this.playlists = new Playlists();

  this.playlists.router.when(
    'switchToPlaylist', [this.playingPlaylist, 'switchToPlaylist']
  );
  this.playlists.router.when(
    'togglePlayingPlaylist', [this.playingPlaylist, 'togglePlaylist']
  );
  this.playingPlaylist.router.when(
    'savePlaylistToPlaylists', [this.playlists, 'savePlaylist']
  );

  this.playlists.router.when(
    'deletedPlaylist', [this.playingPlaylist, 'deletedPlaylist']
  );
  this.playlists.router.when(
    'renamedPlaylist', [this.playingPlaylist, 'renamedPlaylist']
  );
  this.playlists.router.when(
    'shuffledPlaylist', [this.playingPlaylist, 'shuffledPlaylist']
  );
  this.playlists.router.when(
    'deletedItemFromPlaylist', [this.playingPlaylist, 'deletedItemFromPlaylist']
  );
  this.playlists.router.when(
    'addedToPlaylist', [this.playingPlaylist, 'addedToPlaylist']
  );
  this.playlists.router.when(
    'movedItemInPlaylist', [this.playingPlaylist, 'movedItemInPlaylist']
  );
  this.playlists.router.when(
    'switchToSources', [this.playingPlaylist, 'switchToSources']
  );

  this.audioPlayer = new AudioPlayer();

  this.playingPlaylist.router.when('playSong', [this.audioPlayer, 'play']);
  this.playingPlaylist.router.when('pauseSong', [this.audioPlayer, 'pause']);
  this.playingPlaylist.router.when('stopSong', [this.audioPlayer, 'stop']);

  this.audioPlayer.router.when('isEnded', [this.playingPlaylist, 'playNext']);

  this.router = new Router(this);

  this.router.declareRoutes([
    'requestTargetPlaylist',
    'requestSourceFromSong'
  ]);

  Router.proxy(
    [this.playingPlaylist, 'requestSourceFromSong'],
    [this, 'requestSourceFromSong']
  );
  Router.proxy(
    [this.playlists, 'requestSourceFromSong'], [this, 'requestSourceFromSong']
  );

  this.playingPlaylist.router.when('save', [this.playlists, 'savePlaylist']);
  this.playlists.router.when(
    'createdPlaylist', [this.playingPlaylist, 'createdPlaylist']
  );
};

Music.prototype = {
  name: 'music',
  addSongsToCustom: function(title, songs) {
    var hasCurrent = this.playingPlaylist.playlist !== null;
    console.log(hasCurrent);
    this.router.route('requestTargetPlaylist')(
      this.playlists.playlists, title, hasCurrent, function(choice) {
        if (choice === 'new') {
          var playlistId = this.playlists.createEmptyPlaylist(title);
          this.playlists.addToPlaylist(playlistId, songs);

          if (!hasCurrent) {
            this.playingPlaylist.switchToPlaylist(
              this.playlists.playlists[playlistId], playlistId
            );
          }
        }
        else if (choice === 'current') {
          this.playingPlaylist.enqueue(title, songs);
        }
        else if (choice !== 'cancel') {
          this.playlists.addToPlaylist(choice, songs);
        }
      }.bind(this)
    );
  },
  shareSong: function(song) {
    var filename = song.name;
    window.musicLibrary.musicDB.getFile(filename, function(file) {
      // We try to fix Bug 814323 by using
      // current workaround of bluetooth transfer
      // so we will pass both filenames and filepaths
      // The filepaths can be removed after Bug 811615 is fixed
      var name = filename.substring(filename.lastIndexOf('/') + 1);

      // And we just want the first component of the type "audio" or "video".
      var type = file.type;
      type = type.substring(0, type.indexOf('/')) + '/*';

      var a = new MozActivity({
        name: 'share',
        data: {
          type: type,
          number: 1,
          blobs: [file],
          filenames: [name],
          filepaths: [filename]
        }
      });

      a.onerror = function(e) {
        console.warn('share activity error:', a.error.name);
      };
    });
  }
};
