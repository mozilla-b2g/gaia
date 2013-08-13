var MediaLibraryMainPanel = function(){
  this.dom = {
    panel: document.createElement('div'),
    title: document.createElement('div'),
    titleText: document.createElement('div'),
    content: document.createElement('div'),
    items: document.createElement('div')
  }
  this.dom.panel.classList.add('panel');
  this.dom.title.classList.add('title');
  this.dom.titleText.classList.add('titleText');
  this.dom.content.classList.add('content');
  this.dom.items.classList.add('items');

  this.dom.title.appendChild(this.dom.titleText);

  this.dom.content.appendChild(this.dom.items);

  this.dom.panel.appendChild(this.dom.title);
  this.dom.panel.appendChild(this.dom.content);

  var mainTitle = document.createElement('div');
  mainTitle.innerHTML = 'Music Library';
  this.dom.titleText.appendChild(mainTitle);

  this.items = new UIItemList(this.dom.items);

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

  Router.route(this, [
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
    content.innerHTML = item;
    Utils.onButtonTap(content, function(){
      this._gotoNewPanel(item);
    }.bind(this));
    var uiItem = new UIItem(null, content, null, null);
    var div = uiItem.createDiv();
    this.items.append(uiItem);
  },
  _gotoNewPanel: function(item){
    if (
        item === 'Genres' || 
        item === 'Artists' ||
        item === 'Albums'
    ){
      var title = item;
      var query = item;
      this.requestCategoryPanel(title, query);
    }
    else if (item === 'Playlists'){
      this.requestPlaylistsPanel();
    }
    else if (item === 'All Songs'){
      this.requestMusicPanel({
        'genre': '*',
        'artist': '*',
        'album': '*',
        'song': '*'
      });
    }
    else if (item === 'Search'){
      this.requestSearchPanel();
    }
    else if (item === 'Discover'){
      this.requestDiscoverPanel();
    }
  }
}
