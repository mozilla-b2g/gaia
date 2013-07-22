var PlaylistsView = function(list, allowDrag){
  this.dom = {};
  this.dom.list = list;
  this.dom.list.classList.add('playlistsView');

  Utils.setupPassParent(this, 'tapPlaylist');
  Utils.setupPassParent(this, 'gotoPlaylist');
  if (allowDrag){
    Utils.setupPassParent(this, 'movePlaylistRelative');
  }

  this.playlistList = new UIItemList(this.dom.list);

  this.lastCurrentPlaylist = null;
  this.lastCurrentPlaylistId = null;

  this.show = this.playlistList.show.bind(this.playlistList);
  this.hide = this.playlistList.hide.bind(this.playlistList);
}

PlaylistsView.prototype = {
  setPlaylists: function(playlists){
    this.playlistListItems = {};
    this.playlistList.empty();
    for (var playlistId in playlists){
      var playlist = playlists[playlistId];
      var item = this.uiItemFromPlaylist(playlist, playlistId);
      this.playlistListItems[playlistId] = item;
      this.playlistList.append(item);
    }
    if (Utils.size(playlists) === 0){
      var text = Utils.classDiv('text');
      text.innerHTML = 'no playlists';
      this.dom.list.appendChild(text);
    }
    this.setCurrentPlaylist(this.lastCurrentPlaylistId);
  },
  uiItemFromPlaylist: function(playlist, id){

    var content = document.createElement('div');
    content.classList.add('playlistTitle');
    content.innerHTML = playlist.title;
    Utils.onButtonTap(content, function(){
      this.tapPlaylist(id);
    }.bind(this));


    var gotoPlaylistButton = document.createElement('div');
    gotoPlaylistButton.classList.add('gotoPlaylistButton');

    if (playlist.temporary){
      gotoPlaylistButton.classList.add('temporary');
      content.classList.add('temporary');
    }

    Utils.onButtonTap(gotoPlaylistButton, function(){
      this.gotoPlaylist(playlist, id);
    }.bind(this));

    var item = new UIItem(null, content, null, gotoPlaylistButton);

    return item;
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
  }
}
