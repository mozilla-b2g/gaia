var MediaLibraryCategoryPanel = function(title, category, query){

  PanelTools.setupDom(this);

  this.category = category;

  PanelTools.setTitle(this, title);

  this.router.declareRoutes([
    'ready',
    'requestMusicPanel',
  ]);

  this.query = query || {
    'genre': '*',
    'artist': '*',
    'album': '*',
    'song': '*'
  };

  this._prepPanel();
}

MediaLibraryCategoryPanel.prototype = {
  name: "MediaLibraryCategoryPanel",
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
  _prepPanel: function(){
    if (this.category === 'Genres'){
      window.musicLibrary.musicDB.getGenres(this._gotPrepResults.bind(this));
    }
    else if (this.category === 'Artists'){
      window.musicLibrary.musicDB.getArtists(this.query.genre, this._gotPrepResults.bind(this));
    }
    else if (this.category === 'Albums'){
      window.musicLibrary.musicDB.getAlbums(
        this.query.genre,
        this.query.artist,
        this._gotPrepResults.bind(this));
    }
  },
  _gotPrepResults: function(items){
    this.items = items;
    this.router.route('ready')();
    this._set();
  },
  _set: function(){
    this.fields = [];
    if (this.category === 'Genres')
      this.fields.push('genre');
    else if (this.category === 'Artists')
      this.fields.push('artist');
    else if (this.category === 'Albums')
      this.fields.push('album', 'artist');
    this._renderItems();
  },
  _renderItems: function(){
    var sortFields = [];
    if (this.category === 'Genres')
      sortFields.push('genre');
    else if (this.category === 'Albums')
      sortFields.push('album');
    else
      sortFields.push('artist');

    this.items.sort(PanelTools.makeItemSorter(sortFields));

    var itemsToRender = this.items.map(this._prepRenderListItem.bind(this));

    PanelTools.renderItems(this.itemsList, itemsToRender, this.done);
    
  },
  _prepRenderListItem: function(item){
    var content = document.createElement('div');
    content.classList.add('fields');
    for (var j = 0; j < this.fields.length; j++){
      var fieldDiv = document.createElement('div');
      var field = item.metadata[this.fields[j]];
      if (this.fields[j] === 'genre')
        field = field || 'Unknown Genre';
      if (this.fields[j] === 'artist')
        field = field || 'Unknown Artist';
      if (this.fields[j] === 'album')
        field = field || 'Unknown Album';
      fieldDiv.textContent = field;
      content.appendChild(fieldDiv);
    }

    var icon = null;
    if (this.category === 'Albums'){
      icon = document.createElement('img');
      icon.classList.add('albumCoverThumbnail');
      icon.onerror="this.src='';";
      window.musicLibrary.musicDB.getAlbumArtAsURL(item, function(url){
        icon.src = url;
      }.bind(this));
    }

    var gotoPanelButton = Utils.classDiv('gotoPanelButton');
    var target = item.metadata[this.fields[0]];
    Utils.onButtonTap(gotoPanelButton, function(){
      this.query[this.fields[0]] = target;
      this.router.route('requestMusicPanel')(this.query);
    }.bind(this));
    gotoPanelButton.appendChild(content);

    var item = new UIItem(icon, gotoPanelButton, null, null);
    item.createDiv();
    if (this.category === 'Albums'){
      item.dom.content.classList.add('right');
    }
    return item;
  },

}
