var MediaLibraryPlaylistPanel = function(playlist, id){
  PanelTools.setupDom(this);

  var mainTitle = document.createElement('div');
  mainTitle.classList.add('playlistTitle');
  mainTitle.innerHTML = playlist.title;
  this.dom.titleText.appendChild(mainTitle);

  var menu = new Menu({ 
    'delete': 'delete',
    'shuffle': 'shuffle',
    'rename': 'rename',
  });
  this.dom.title.appendChild(menu.dom.icon);
  menu.onselect = function(select){
    if (select === 'delete'){
      this.deletePlaylist(id);
      this.pop();
    }
    else if (select === 'shuffle'){
      this.shufflePlaylist(id);
    }
    else if (select === 'rename'){
      var title = prompt("Playlist Name:");
      if (title !== null && title !== '')
        this.renamePlaylist(id, title);
    }
  }.bind(this);
  
  this.playlist = playlist;

  this.id = id;

  this.dom.items.classList.add('playlist');
  this.dom.panel.classList.add('playlistPanel');

  this.itemsList.draggable = true;
  this.itemsList.onelemMoved = this._onElemMoved.bind(this);

  Router.route(this, [
    'deleteItemFromPlaylist',
    'deletePlaylist',
    'shufflePlaylist',
    'renamePlaylist',
    'movePlaylistItemRelative',
  ]);

  this._set();
}

MediaLibraryPlaylistPanel.prototype = {
  name: "MediaLibraryPlaylistPanel",
  //============== APi ===============
  getContainer: function(){
    return this.dom.panel;
  },
  unload: function(){

  },
  refresh: function(done){
    if (done)
      done();
  },
  updatePlaylist: function(playlist){
    this.playlist = playlist;
    this._set();
  },
  updateMode: function(mode){

  },
  //============== helpers ===============
  _set: function(){
    this.itemsList.empty();
    if (this.playlist.list.length === 0){
      var text = Utils.classDiv('text');
      text.innerHTML = 'playlist empty';
      this.dom.items.appendChild(text);
    }

    for (var i = 0; i < this.playlist.list.length; i++){
      var source = this.playlist.list[i];

      var showAlbumArt = true;
      if (i > 0){
        var other = this.playlist.list[i-1];
        showAlbumArt = !source.hasSameAlbumArt(other);
      }

      var item = this._uiItemFromPlaylistItem(source, i+1, showAlbumArt);
      this.itemsList.append(item);
      item.dom.div.classList.add('playlistViewItem');
    }
  },
  _uiItemFromPlaylistItem: function(source, index, showAlbum){
    var content = document.createElement('div');
    var contentText = Utils.classDiv('info');


    if (showAlbum){
      var contentAlbumCover = document.createElement('img');
      contentAlbumCover.src = '';
      contentAlbumCover.classList.add('albumCover');
      source.setAlbumArt(contentAlbumCover);
      content.appendChild(contentAlbumCover);
      contentText.classList.add('right');
    }

    content.appendChild(contentText);
    source.setInfo(contentText);
    //Utils.onButtonTap(content, function(){
    //  this.switchToPlaylistItem(item.index);
    //}.bind(this));


    var icon = document.createElement('div');
    icon.classList.add('tracknum');
    icon.innerHTML = index;

    var del = document.createElement('div');
    del.classList.add('playlistItemDelete');

    var item = new UIItem(icon, content, null, del);
    item.data.source = source;
    Utils.onButtonTap(del, function(){
      this.deleteItemFromPlaylist(this.id, item.index);
      this.itemsList.remove(item);
    }.bind(this));

    return item;
  },
  _onElemMoved: function(moveData){
    var item = moveData.item;
    var relativeItem = moveData.relativeItem;
    var relativeDir = moveData.relativeDir;
    this.movePlaylistItemRelative(this.id, item.data.source, relativeItem.data.source, relativeDir);
  },
}
