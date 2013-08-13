var Tests = function(){

}

Tests.prototype = {
  testRemoveFromPlaylist: function(){
    Router.addRouterReceptor(window.musicLibrary, 'doneLoading', function(){
      window.musicLibrary.musicDB.getSongs('*', '*', 'Abbey Road', 
        function(items){
          window.ui.onrequestPlaySongs('AR|TEST', items);
          window.ui.viewVisibility.showCurrentMusicPage();
          setTimeout(function(){
            window.ui.viewVisibility.toggleCurrentMusicPageView();
            var playlist = window.app.playingPlaylist.playlist;
            var old3 = playlist.list[3];
            var old4 = playlist.list[4];

            var deleteButton = window.ui.currentMusicPage.playlist.playlist.items[3].dom.div.querySelector('.playlistItemDelete');
            deleteButton.tapManager.tap();

            var new3 = playlist.list[3];
            if (old4 !== new3 || playlist.indexOf(old3) !== null){
              alert("FAIL " + (old4 !== new3) + " " + playlist.list.indexOf(old3));
            }
          }, 1000);
        });
    });
  },
  testRemoveMultipleFromPlaylist: function(){
    Router.addRouterReceptor(window.musicLibrary, 'doneLoading', function(){
      window.musicLibrary.musicDB.getSongs('*', '*', 'Abbey Road', 
        function(items){
          window.ui.onrequestAddSongs('AR|TEST', items);
          window.ui.viewVisibility.showCurrentMusicPage();
          setTimeout(function(){
            var playlist = window.app.playingPlaylist.playlist;

            //var deleteButton = window.ui.currentMusicPage.playlist.playlist.items[3].dom.div.querySelector('.playlistItemDelete');
            //deleteButton.tapManager.tap();
            //var deleteButton = window.ui.currentMusicPage.playlist.playlist.items[4].dom.div.querySelector('.playlistItemDelete');
            //deleteButton.tapManager.tap();
          }, 1000);
        });
    });
  },
  gotoFirstPlaylist: function(){
      Router.addRouterReceptor(window.musicLibrary, 'doneLoading', function(){
        setTimeout(function(){
          window.ui.mediaLibraryPage.createPlaylistsPanel();
          var playlistButton = window.ui.mediaLibraryPage.panelManager.panels[0].itemsList.items[0].dom.div.querySelector('.gotoPlaylistButton');
          playlistButton.tapManager.tap();
        }, 500);
      });
  },
  gotoAlbum: function(){
    this.gotoMusicPanel({
        genre: '*',
        artist: '*',
        album: 'Abbey Road',
        song: '*'
    });
  },
  gotoArtist: function(){
    this.gotoMusicPanel({
        genre: '*',
        artist: 'The Beatles',
        album: '*',
        song: '*'
    });
  },
  gotoAllSongs: function(){
    this.gotoMusicPanel({
        genre: '*',
        artist: '*',
        album: '*',
        song: '*'
    });
  },
  gotoMusicPanel: function(query){
    Router.addRouterReceptor(window.musicLibrary, 'doneLoading', function(){
      setTimeout(function(){
        window.ui.mediaLibraryPage.createMusicPanel(query);
      }, 500);
    });
  },
  performSearch: function(){
    Router.addRouterReceptor(window.musicLibrary, 'doneLoading', function(){
      setTimeout(function(){
        window.ui.mediaLibraryPage.createSearchPanel();
        var input = window.ui.mediaLibraryPage.panelManager.panels[0].dom.input.value = 'The';
        window.ui.mediaLibraryPage.panelManager.panels[0]._search();
      }, 500);
    });
  },
  createPlaylist: function(){
    Router.addRouterReceptor(window.musicLibrary, 'doneLoading', function(){
      setTimeout(function(){
        var id = window.app.playlists.createEmptyPlaylist('test_playlist');
        window.musicLibrary.musicDB.getSongs('*', '*', 'Abbey Road', 
          function(items){
            window.app.playlists.addToPlaylist(id, items);
          });
      }, 500);
    });
  },
  gotoPlaylists: function(){
    Router.addRouterReceptor(window.musicLibrary, 'doneLoading', function(){
      setTimeout(function(){
        window.ui.mediaLibraryPage.createPlaylistsPanel();
      }, 500);
    });
  }
}
