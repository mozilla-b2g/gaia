var MediaLibraryArtistPanel = function(mode, songs, albums){

  this.mode = mode;

  PanelTools.setupDom(this);

  this.title = songs[0].metadata.artist || 'Unknown Artist';
  PanelTools.setTitle(this, this.title);

  this.router.declareRoutes([
    'requestMusicPanelFromItems',
  ]);

  this.songs = songs;
  this.albums = albums;

  this._set();
}

MediaLibraryArtistPanel.prototype = {
  name: "MediaLibraryArtistPanel",
  //============== APi ===============
  getContainer: function(){
    return this.dom.panel;
  },
  unload: function(){
    this.itemsList.destroy();
  },
  refresh: function(done){
    if (done)
      done();
  },
  updateMode: function(mode){
    this.mode = mode;
    this._set();
  },
  //============== helpers ===============
  _set: function(){
    this.itemsList.empty();
    this._setAlbums();
    this._setSongs();
  },
  _setAlbums: function(){
    var numAlbums = Utils.size(this.albums);
    for (var albumName in this.albums){
      var item = this._renderAlbum(this.albums[albumName], numAlbums);
      this.itemsList.append(item);
    }
  },
  _setSongs: function(){
    var sortFields = [];
    sortFields.push('artist', 'album', 'tracknum', 'title');

    this.fields = ['title', 'artist', 'album'];

    var itemsToRender = this.songs.map(this._prepSong.bind(this));
    PanelTools.renderItems(this.itemsList, itemsToRender, this.done);
  },
  _renderAlbum: function(album, num){
    var content = Utils.classDiv('album');

    var img = document.createElement('img');
    img.onerror="this.src='';";
    window.musicLibrary.musicDB.getAlbumArtAsURL(album, function(url){
      img.src = url;
    }.bind(this));
    content.appendChild(img);

    var text = Utils.classDiv('text');
    text.textContent = album.metadata.album;
    content.appendChild(text);

    var target = album.metadata.album;
    Utils.onButtonTap(content, function(){
      var songs = this._filterSongsToAlbum(this.songs, album.metadata.album);
      var query = {
        'genre': '*',
        'artist': album.metadata.artist,
        'album': album.metadata.album,
        'song': '*'
      };
      this.router.route('requestMusicPanelFromItems')(query, songs);
    }.bind(this));

    var item = new UIItem(null, content, null, null);
    item.createDiv();
    item.dom.div.classList.add('albumItem');
    if (num % 3 == 0 || num >= 5)
      item.dom.div.classList.add('third');
    else
      item.dom.div.classList.add('half');
    return item;
  },
  _filterSongsToAlbum: function(songs, album){
    var filtered = [];
    for (var i = 0; i < songs.length; i++){
      if (songs[i].metadata.album === album)
        filtered.push(songs[i]);
    }
    return filtered
  },
  _prepSong: function(song){
    var uiItem = PanelTools.renderSong({
      song: song,
      fields: this.fields,
      known: {
        artist: true,
        album: false,
        title: false
      },
      hideAdd: this.mode !== 'edit',
      showTrack: true,
      ontap: function(){
        if (this.mode !== 'edit'){
          //TODO do everything or just the album?
          this.router.route('requestPlaySongs')(this.title, this.songs);
          var index = this.songs.indexOf(song);
          this.router.route('switchPlayingToIndex')(index);
        }
        else {
          this.router.route('requestAddSongs')(song.metadata.title, [song]);
        }
      }.bind(this),
      extraOptions: this.extraOptions,
      addTo: function(){
        this.router.route('requestAddSongsToCustom')(song.metadata.title, [song]);
      }.bind(this),
      toggleFavorite: function(){
        window.musicLibrary.musicDB.toggleSongFavorited(song);
      }.bind(this),
      share: function(){
        this.router.route('shareSong')(song);
      }.bind(this)
    });

    return uiItem;
  }
}
