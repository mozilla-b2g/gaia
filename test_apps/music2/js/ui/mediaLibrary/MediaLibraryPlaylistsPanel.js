var MediaLibraryPlaylistsPanel = function(playlists, currentPlaylist, currentPlaylistId){
  PanelTools.setupDom(this);

  PanelTools.setTitle(this, 'Playlists');

  var menu = new Menu({ 
    'create': 'create'
  });
  this.dom.title.appendChild(menu.dom.icon);
  menu.router.when('select', function(select){
    if (select === 'create'){
      this._createPlaylist();
    }
  }.bind(this));

  this.playlists = playlists;

  this.lastCurrentPlaylist = null;
  this.lastCurrentPlaylistId = null;

  this.dom.items.classList.add('playlistsView');

  this.router.declareRoutes([
    'requestPlaylistPanel',
    'togglePlaylist',
    'createPlaylist',
    'copyPlaylist',
  ]);

  this._set();
  this.updateCurrentPlaylist(currentPlaylist, currentPlaylistId);
}

MediaLibraryPlaylistsPanel.prototype = {
  name: "MediaLibraryPlaylistsPanel",
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
  updateMode: function(mode){

  },
  updatePlaylists: function(playlists){
    this.playlists = playlists;
    this._set();
    //console.log("GOT_PLAYLISTS!", JSON.stringify(this.playlists, null, 2));
  },
  updateCurrentPlaylist: function(playlist, playlistId){
    this.setCurrentPlaylist(playlistId);
  },
  //============== helpers ===============
  _set: function(){
    //console.log(JSON.stringify(this.playlists, null, 2));

    this.playlistListItems = {};
    this.itemsList.empty();

    var item = this._createFavoritesPlaylistUIItem();
    this.playlistListItems['favorites'] = item;
    this.itemsList.append(item);

    for (var playlistId in this.playlists){
      var playlist = this.playlists[playlistId];
      var item = this._uiItemFromPlaylist(playlist, playlistId);
      this.playlistListItems[playlistId] = item;
      this.itemsList.append(item);
    }
    if (Utils.size(this.playlists) === 0){
      var text = Utils.classDiv('text');
      text.textContent = 'no user playlists';
      this.dom.items.appendChild(text);
    }
    this.setCurrentPlaylist(this.lastCurrentPlaylistId);
  },
  _uiItemFromPlaylist: function(playlist, id){
    return this._createPlaylistUIItem(
          playlist.title,
          function toggleActive(){
            this.router.route('togglePlaylist')(id);
          }.bind(this),
          function openPlaylist(){
            this.router.route('requestPlaylistPanel')(playlist, id);
          }.bind(this));
  },
  _createFavoritesPlaylistUIItem: function(){
    var item = this._createPlaylistUIItem(
          'favorites',
          function toggleActive(){
            this.router.route('togglePlaylist')('favorites');
          }.bind(this),
          function openPlaylist(){ });
    item.primaryButton = null;
    return item;
  },
  _createPlaylistUIItem: function(title, toggleActive, openPlaylist){
    var content = document.createElement('div');
    content.classList.add('playlistTitle');
    content.textContent = title;
    Utils.onButtonTap(content, toggleActive);

    var gotoPlaylistButton = document.createElement('div');
    gotoPlaylistButton.classList.add('gotoPlaylistButton');

    Utils.onButtonTap(gotoPlaylistButton, openPlaylist);
    var item = new UIItem(null, content, null, gotoPlaylistButton);

    return item;
  },
  setCurrentPlaylist: function(currentPlaylistId){
    if (this.lastCurrentPlaylist !== null){
      this.lastCurrentPlaylist.setIcon(null);
    }
    if (currentPlaylistId === null){
      this.lastCurrentPlaylist = null;
      this.lastCurrentPlaylistId = null;
    }
    else if (this.playlistListItems[currentPlaylistId] !== undefined){
      var item = this.playlistListItems[currentPlaylistId];
      item.setIcon('currentPlaylist');
      this.lastCurrentPlaylist = item;
      this.lastCurrentPlaylistId = currentPlaylistId;
    }
    else {
      this.lastCurrentPlaylist = null;
      this.lastCurrentPlaylistId = null;
    }
  },
  _createPlaylist: function(){
    var options ={
      'create empty playlist': '__empty'
    };
    var numPlaylists = 0;

    for (var playlistId in this.currentPlaylists){
      var playlist = this.currentPlaylists[playlistId];
      options['copy ' + playlist.title] = playlistId;
      numPlaylists += 1;
    }

    options['cancel'] = { 'value': '__cancel', 'default': true };

    if (numPlaylists === 0){
      var title = prompt("Playlist Name:");
      if (title !== null && title !== '')
        this.router.route('createPlaylist')(title);
    }
    else {
      Utils.select(options, function(choice){
        var title;
        if (choice === '__cancel'){

        }
        else if (choice === '__empty'){
          title = prompt("Playlist Name:");
          if (title !== null && title !== '')
            this.router.route('createPlaylist')(title);
        }
        else {
          title = prompt("Playlist Name:", 'copy of ' + this.currentPlaylists[choice].title);
          if (title !== null && title !== '')
            this.router.route('copyPlaylist')(title, choice);
        }
      }.bind(this));
    }
  }
}
