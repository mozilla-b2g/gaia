var PlaylistDrawer = function(){
  Utils.loadDomIds(this, [
      "playlistDrawer",
      "playlistDrawerTitle",
      "playlistDrawerTitleContent",
      "playlistDrawerTitleBack",
      "playlistDrawerTitleDel",
      "playlistDrawerTitleRename",
      "playlistDrawerPlaylists",
      "playlistDrawerPlaylistItems",
  ]);

  this.dom.title = this.dom.playlistDrawerTitle
  this.dom.titleContent = this.dom.playlistDrawerTitleContent;

  var hideAlbumArt = true;
  this.playlist = new PlaylistView(this.dom.playlistDrawerPlaylistItems, hideAlbumArt);
  this.playlistList = new UIItemList(this.dom.playlistDrawerPlaylists);

  this.lastCurrentPlaylist = null;
  this.lastCurrentPlaylistId = null;

  this.selectedPlaylistId = null;

  Utils.setupPassEvent(this, 'createPlaylist');
  Utils.setupPassEvent(this, 'deletePlaylist');
  Utils.setupPassEvent(this, 'renamePlaylist');
  Utils.setupPassEvent(this, 'switchPlaylist');

  Utils.onButtonTap(this.dom.playlistDrawerTitleBack, this.switchToPlaylistView.bind(this));
  Utils.onButtonTap(this.dom.playlistDrawerTitleDel, this.deleteCurrentPlaylist.bind(this));

  Utils.onButtonTap(this.dom.playlistDrawerTitleRename, this.renameCurrentPlaylist.bind(this));

}

PlaylistDrawer.prototype = {
  setPlaylists: function(playlists){
    this.playlistListItems = {};
    this.playlistList.empty();
    for (var playlistId in playlists){
      var playlist = playlists[playlistId];
      if (playlistId === this.selectedPlaylistId){
        this.playlist.setPlaylist(playlist, playlistId);
        this.dom.titleContent.innerHTML = playlist.title;
      }
      var item = this.uiItemFromPlaylist(playlist, playlistId);
      this.playlistListItems[playlistId] = item;
      this.playlistList.append(item);
    }
    if (Utils.size(playlists) === 0){
      var text = Utils.classDiv('text');
      text.innerHTML = 'no playlists';
      this.dom.playlistDrawerPlaylists.appendChild(text);
    }
    var newPlaylistItem = this.uiItemNewPlaylist();
    this.playlistList.append(newPlaylistItem);
    newPlaylistItem.dom.div.classList.add('newPlaylist');
    this.setCurrentPlaylist(this.lastCurrentPlaylistId);
  },
  setCurrentPlaylist: function(currentPlaylistId){
    var item = this.playlistListItems[currentPlaylistId];
    if (this.lastCurrentPlaylist !== null){
      this.lastCurrentPlaylist.setIcon(null);
    }
    if (item === undefined){
      this.lastCurrentPlaylist = null;
      return;
    }
    item.setIcon('currentPlaylist');
    this.lastCurrentPlaylist = item;
    this.lastCurrentPlaylistId = currentPlaylistId;
  },
  uiItemFromPlaylist: function(playlist, id){

    var content = document.createElement('div');
    content.classList.add('playlistTitle');
    content.innerHTML = playlist.title;
    Utils.onButtonTap(content, function(){
      this.switchPlaylist(id);
    }.bind(this));


    var gotoPlaylistButton = document.createElement('div');
    gotoPlaylistButton.classList.add('gotoPlaylistButton');

    if (playlist.temporary){
      gotoPlaylistButton.classList.add('temporary');
      content.classList.add('temporary');
    }

    Utils.onButtonTap(gotoPlaylistButton, function(){
      this.switchToPlaylistItemView(playlist, id);
    }.bind(this));

    var item = new UIItem(null, content, null, gotoPlaylistButton);

    return item;
  },
  switchToPlaylistItemView: function(playlist, playlistId){
    this.playlist.show();
    this.playlistList.hide();

    this.dom.titleContent.innerHTML = playlist.title;
    this.dom.title.classList.remove('hidden');

    this.playlist.setPlaylist(playlist, playlistId);

    this.selectedPlaylistId = playlistId;

  },
  switchToPlaylistView: function(){
    this.playlistList.show();
    this.playlist.hide();

    this.dom.title.classList.add('hidden');

    this.selectedPlaylistId = null;
  },
  deleteCurrentPlaylist: function(){
    var playlist = this.selectedPlaylistId;
    this.switchToPlaylistView();
    this.deletePlaylist(playlist);
  },
  renameCurrentPlaylist: function(){
      var title = prompt("Playlist Name:");
      this.renamePlaylist(this.selectedPlaylistId, title);
  },
  uiItemNewPlaylist: function(){
    var content = document.createElement('div');
    content.classList.add('playlistTitle');
    content.innerHTML = 'create playlist';

    Utils.onButtonTap(content, function(){
      var title = prompt("Playlist Name:");
      if (title === null || title === '')
        return;
      this.createPlaylist(title);
    }.bind(this));
    
    var item = new UIItem('noicon', content, null, null);
    return item;
  }
}
