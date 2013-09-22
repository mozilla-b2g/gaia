function MediaLibraryPlaylistPanel(playlist, id, currentPlaylistId){
  PanelTools.setupDom(this);

  this.router = new Router(this);
  this.router.declareRoutes([
    'deleteItemFromPlaylist',
    'deletePlaylist',
    'shufflePlaylist',
    'renamePlaylist',
    'movePlaylistItemRelative',
    'switchPlaylist',
  ]);


  this.title = playlist.title;
  PanelTools.setTitle(this, this.title);

  this.playlistView = new PlaylistView(this.dom.items);
  Router.connect(this.playlistView, this, {
    'deleteItemFromPlayingPlaylist': '_deleteItem',
    'switchToPlaylistItem': '_gotoItem',
    'movePlaylistItemRelative': '_movePlaylistItemRelative',
  });
  Router.proxy(this.playlistView, this, {
    'requestAddSongsToCustom': 'requestAddSongsToCustom',
    'shareSong': 'shareSong'
  });

  this.id = id;
  this.mode = 'simple';
  this.updatePlaylist(playlist);

  this.updateCurrentPlaylist(null, currentPlaylistId);
}

MediaLibraryPlaylistPanel.prototype = {
  name: "MediaLibraryPlaylistPanel",
  //============== API ===============
  getContainer: function(){
    return this.dom.panel;
  },
  unload: function(){
    this.playlistView.destroy();
  },
  refresh: function(done){
    if (done)
      done();
  },
  updatePlaylist: function(playlist){
    this.playlist = playlist;
    this.playlistView.setPlaylist(this.playlist, this.mode);
  },
  updateCurrentPlaylist: function(playlist, playlistId){
    if (this.menu)
      Utils.remove(this.menu.dom.icon);
    if (playlistId !== this.id){
      this.menu = new Menu({ 
        'delete': 'delete',
        'shuffle': 'shuffle',
        'rename': 'rename',
        'open': 'open'
      });
      this.dom.title.appendChild(this.menu.dom.icon);
      this.menu.router.when('select', this._selectMenu.bind(this));
    }
    else {
      this.menu = new Menu({ 
        'delete': 'delete',
        'shuffle': 'shuffle',
        'rename': 'rename'
      });
      this.dom.title.appendChild(this.menu.dom.icon);
      this.menu.router.when('select', this._selectMenu.bind(this));
    }
  },
  updateMode: function(mode){
    //this.mode = mode;
    //this.playlistView.updateMode(this.mode);
  },
  //============== helpers ===============
  _deleteItem: function(item){
    this.router.route('deleteItemFromPlaylist')(this.id, item);
  },
  _gotoItem: function(item){
    this.router.route('switchPlaylist')(this.id);
    this.router.route('switchPlayingToIndex')(item);
  },
  _movePlaylistItemRelative: function(playlist, itemSource, relativeItemSource, relativeDir){
    this.router.route('movePlaylistItemRelative')(this.id, itemSource, relativeItemSource, relativeDir);
  },
  _selectMenu: function(select){
    if (select === 'delete'){
      this.router.route('deletePlaylist')(this.id);
      this.router.route('pop')();
    }
    else if (select === 'shuffle'){
      this.router.route('shufflePlaylist')(this.id);
    }
    else if (select === 'rename'){
      var title = prompt("Playlist Name:");
      if (title !== null && title !== '')
        this.router.route('renamePlaylist')(this.id, title);
    }
    else if (select === 'open'){
      this.router.route('switchPlaylist')(this.id);
    }
  }
}
