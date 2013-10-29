var MediaLibraryMainPanel = function(){

  PanelTools.setupDom(this);

  Utils.remove(this.dom.back);

  PanelTools.setTitle(this, 'Music Library');

  var items = [
    "Genres",
    "Artists",
    "Albums",
    "Discover",
    "Playlists",
    "All Songs",
    "Search"
  ];

  items.forEach(this._appendItem.bind(this));

  this.router = new Router(this);

  this.router.declareRoutes([
    'requestCategoryPanel',
    'requestPlaylistsPanel',
    'requestAllMusicPanel',
    'requestMusicPanel',
    'requestSearchPanel',
    'requestDiscoverPanel',
  ]);
}

MediaLibraryMainPanel.prototype = {
  name: "MediaLibraryMainPanel",
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
  //============== helpers ===============
  _appendItem: function(item){
    var content = document.createElement('div');
    content.classList.add('gotoPanelButton');
    content.textContent = item;
    Utils.onButtonTap(content, function gotoNewPanel(){
      this._gotoNewPanel(item);
    }.bind(this), this);
    var uiItem = new UIItem(null, content, null, null);
    var div = uiItem.createDiv();
    this.itemsList.append(uiItem);
  },
  _gotoNewPanel: function(item){
    if (
        item === 'Genres' || 
        item === 'Artists' ||
        item === 'Albums'
    ){
      var title = item;
      var query = item;
      this.router.route('requestCategoryPanel')(title, query);
    }
    else if (item === 'Playlists'){
      this.router.route('requestPlaylistsPanel')();
    }
    else if (item === 'All Songs'){
      this.router.route('requestMusicPanel')({
        'genre': '*',
        'artist': '*',
        'album': '*',
        'song': '*'
      });
    }
    else if (item === 'Search'){
      this.router.route('requestSearchPanel')();
    }
    else if (item === 'Discover'){
      this.router.route('requestDiscoverPanel')();
    }
  }
}
