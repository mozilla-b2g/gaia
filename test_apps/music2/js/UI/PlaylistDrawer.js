var PlaylistDrawer = function(){
  Utils.loadDomIds(this, [
      "playlistDrawer",
      "playlistDrawerTitle",
      "playlistDrawerTitleContent",
      "playlistDrawerTitleBack",
      "playlistDrawerTitleDel",
      "playlistDrawerTitleEdit",
      "playlistDrawerPlaylists",
      "playlistDrawerPlaylistItems",
      "playlistDrawerNewPlaylist"
  ]);

  this.dom.title = this.dom.playlistDrawerTitle
  this.dom.titleContent = this.dom.playlistDrawerTitleContent;

  var hideAlbumArt = true;
  this.playlist = new PlaylistView(this.dom.playlistDrawerPlaylistItems, hideAlbumArt);
  var allowDrag = true;
  this.playlists = new PlaylistsView(this.dom.playlistDrawerPlaylists, allowDrag);

  this.selectedPlaylistId = null;

  Utils.setupPassParent(this, 'createPlaylist');
  Utils.setupPassParent(this, 'copyPlaylist');
  Utils.setupPassParent(this, 'deletePlaylist');
  Utils.setupPassParent(this, 'renamePlaylist');
  Utils.setupPassParent(this, 'shufflePlaylist');
  Utils.setupPassParent(this, 'switchPlaylist');

  Utils.onButtonTap(this.dom.playlistDrawerTitleBack, this.switchToPlaylistView.bind(this));
  Utils.onButtonTap(this.dom.playlistDrawerTitleDel, this.deleteCurrentPlaylist.bind(this));

  Utils.onButtonTap(this.dom.playlistDrawerTitleEdit, this.editCurrentPlaylist.bind(this));

  Utils.onButtonTap(this.dom.playlistDrawerNewPlaylist, this.newPlaylist.bind(this));

  this.playlists.ontapPlaylist = this.switchPlaylist.bind(this);
  this.playlists.ongotoPlaylist = this.switchToPlaylistItemView.bind(this);

  this.currentPlaylists = {};

}

PlaylistDrawer.prototype = {
  name: 'playlistDrawer',
  setPlaylists: function(playlists){
    this.currentPlaylists = playlists;
    this.playlists.setPlaylists(playlists);

    for (var playlistId in playlists){
      if (playlistId === this.selectedPlaylistId){
        var playlist = playlists[playlistId];
        this.playlist.setPlaylist(playlist, playlistId);
        this.dom.titleContent.innerHTML = playlist.title;
      }
    }
  },
  switchPlaylist: function(currentPlaylistId){
    this.setCurrentPlaylist(currentPlaylistId);
  },
  setCurrentPlaylist: function(currentPlaylistId){
    this.playlists.setCurrentPlaylist(currentPlaylistId);
    this.playlist.setPlaylist(this.currentPlaylists[currentPlaylistId], currentPlaylistId);
  },
  switchToPlaylistItemView: function(playlist, playlistId){
    this.playlist.show();
    this.playlists.hide();
    this.dom.playlistDrawerNewPlaylist.classList.add('hidden');

    this.dom.titleContent.innerHTML = playlist.title;
    this.dom.title.classList.remove('hidden');

    this.playlist.setPlaylist(playlist, playlistId);

    this.selectedPlaylistId = playlistId;

  },
  switchToPlaylistView: function(){
    this.playlists.show();
    this.dom.playlistDrawerNewPlaylist.classList.remove('hidden');
    this.playlist.hide();

    this.dom.title.classList.add('hidden');

    this.selectedPlaylistId = null;
  },
  deleteCurrentPlaylist: function(){
    var playlist = this.selectedPlaylistId;
    this.switchToPlaylistView();
    this.deletePlaylist(playlist);
  },
  editCurrentPlaylist: function(){
    var options = {
      'rename playlist': 'renameCurrentPlaylist',
      'shuffle playlist': 'shuffleCurrentPlaylist',
      'cancel': { 'value': '__cancel', 'default': true }
    };

    Utils.select(options, function(choice){
      if (choice !== '__cancel')
        this[choice]();
    }.bind(this));
  },
  renameCurrentPlaylist: function(){
    var title = prompt("Playlist Name:");
    if (title !== null && title !== '')
      this.renamePlaylist(this.selectedPlaylistId, title);
  },
  shuffleCurrentPlaylist: function(){
    this.shufflePlaylist(this.selectedPlaylistId);
  },
  newPlaylist: function(){

    var options ={
      'create empty playlist': '__empty'
    };

    for (var playlistId in this.currentPlaylists){
      var playlist = this.currentPlaylists[playlistId];
      options['copy ' + playlist.title] = playlistId;
    }

    options['cancel'] = { 'value': '__cancel', 'default': true };

    Utils.select(options, function(choice){
      var title;
      if (choice === '__cancel'){

      }
      else if (choice === '__empty'){
        title = prompt("Playlist Name:");
        if (title !== null && title !== '')
          this.createPlaylist(title);
      }
      else {
        title = prompt("Playlist Name:", 'copy of ' + this.currentPlaylists[choice].title);
        if (title !== null && title !== '')
          this.copyPlaylist(title, choice);
      }
    }.bind(this));
  }
}
