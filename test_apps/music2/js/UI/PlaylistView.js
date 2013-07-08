var PlaylistView = function(list, hideAlbumArt){
  this.dom = {};
  this.dom.list = list;
  this.dom.list.classList.add('playlistView');

  this.hideAlbumArt = hideAlbumArt;

  this.playlist = new UIItemList(this.dom.list);
  this.playlist.draggable = true;

  this.playlist.onelemMoved = this.onElemMoved.bind(this);

  Utils.setupPassParent(this, 'deleteItemFromPlaylist');
  Utils.setupPassParent(this, 'switchToPlaylistItem');
  Utils.setupPassParent(this, 'movePlaylistItemRelative');

  this.show = this.playlist.show.bind(this.playlist);
  this.hide = this.playlist.hide.bind(this.playlist);

  this.currentPlaylist = null;
}

PlaylistView.prototype = {
  setPlaylist: function(playlist, playlistId){
    this.currentPlaylist = playlist;
    this.playlist.empty();

    if (playlist === null || playlist === undefined){
      var text = Utils.classDiv('text');
      text.innerHTML = 'no playlist selected:<br>select songs or select a playlist';
      this.dom.list.appendChild(text);
      return;
    }

    if (playlist.list.length === 0){
      var text = Utils.classDiv('text');
      text.innerHTML = 'playlist empty';
      this.dom.list.appendChild(text);
    }

    for (var i = 0; i < playlist.list.length; i++){
      var source = playlist.list[i];

      var showAlbumArt = true;
      if (i > 0){
        var other = playlist.list[i-1];
        if (other.parentPageName === source.parentPageName){
          showAlbumArt = !source.hasSameAlbumArt(other);
        }
      }
      var item = this.uiItemFromPlaylistItem(source, playlistId, i+1, showAlbumArt);
      this.playlist.append(item);
      item.dom.div.classList.add('playlistViewItem');
    }
  },
  uiItemFromPlaylistItem: function(source, playlistId, index, showAlbum){
    var content = document.createElement('div');
    var contentText = Utils.classDiv('info');

    if (showAlbum && !this.hideAlbumArt){
      var contentAlbumCover = document.createElement('img');
      contentAlbumCover.src = '';
      contentAlbumCover.classList.add('albumCover');
      source.setAlbumArt(contentAlbumCover);
      content.appendChild(contentAlbumCover);
      contentText.classList.add('right');
    }

    content.appendChild(contentText);
    source.setInfo(contentText);
    this.setupOnSwitchEvent(content, source, playlistId);

    var more = null;

    var icon;
    var state = source.getState();
    if (state === 'pause')
      icon = 'beingPausedIcon';
    else if (state === 'play')
      icon = 'beingPlayedIcon';
    else {
      icon = document.createElement('div');
      icon.classList.add('tracknum');
      icon.innerHTML = index;
    }

    var del = document.createElement('div');
    del.classList.add('playlistItemDelete');

    var item = new UIItem(icon, content, more, del);
    item.data.source = source;
    this.setupOnDeleteClick(del, item, source, playlistId);

    return item;
  },
  onElemMoved: function(moveData){
    var item = moveData.item;
    var relativeItem = moveData.relativeItem;
    var relativeDir = moveData.relativeDir;
    this.movePlaylistItemRelative(this.currentPlaylist, item.data.source, relativeItem.data.source, relativeDir);
  },
  setupOnDeleteClick: function(rm, item, source, playlistId){
    Utils.onButtonTap(rm, function(){
      this.playlist.remove(item);
      this.deleteItemFromPlaylist(source, playlistId);
    }.bind(this));
  },
  setupOnSwitchEvent: function(clickable, source, playlistId){
    Utils.onButtonTap(clickable, function(){
      this.switchToPlaylistItem(source, playlistId);
    }.bind(this));
  }
}
