var MediaLibraryDiscoverPanel = function(albums){

  PanelTools.setupDom(this);

  PanelTools.setTitle(this, 'Discover');

  this.router.declareRoutes([
    'requestMusicPanel'
  ]);

  this.albums = albums;

  this._set();
}

MediaLibraryDiscoverPanel.prototype = {
  name: "MediaLibraryDiscoverPanel",
  //============== API ===============
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
  _set: function(){
    this._setAlbums();
  },
  _setAlbums: function(){
    var itemsToRender = this.albums.map(this._prepAlbum.bind(this));
    itemsToRender.forEach(this.itemsList.append.bind(this.itemsList));
  },
  _prepAlbum: function(album){
    var content = Utils.classDiv('album');

    var img = document.createElement('img');
    img.onerror="this.src='';";
    //TODO on onload, URL.releaseObjectURL(url);
    window.musicLibrary.musicDB.getAlbumArtAsURL(album, function(url){
      img.src = url;
    }.bind(this));
    content.appendChild(img);

    var text = Utils.classDiv('text');
    text.textContent = album.metadata.album;
    content.appendChild(text);

    var target = album.metadata.album;
    Utils.onButtonTap(content, function(){
      var query = {
        'genre': '*',
        'artist': '*',
        'album': album.metadata.album,
        'song': '*'
      };
      this.router.route('requestMusicPanel')(query);
    }.bind(this));

    var item = new UIItem(null, content, null, null);
    item.createDiv();
    item.dom.div.classList.add('albumItem');
    item.dom.div.classList.add('half');
    return item;
  },
}
