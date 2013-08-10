var MediaLibrarySearchPanel = function(mode){
  PanelTools.setupDom(this);

  this.mode = mode;

  this.dom.input = document.createElement('input');
  this.dom.input.type = 'search';
  this.dom.input.placeholder = 'search...';
  this.dom.titleText.appendChild(this.dom.input);

  Utils.onEnter(this.dom.input, this._search.bind(this));

  Router.route(this, [
    'requestMusicPanel',
    'requestPlaySongs',
    'requestAddSongs',
    'requestAddSongsToCustom',
  ]);

}

MediaLibrarySearchPanel.prototype = {
  name: "MediaLibrarySearchPanel",
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
    this.mode = mode;
    this._search();
  },
  //============== helpers ===============
  _search: function(){
    var search = this.dom.input.value;
    this.dom.input.blur();
    window.musicLibrary.musicDB.search(search, this._displaySearchResults.bind(this));
  },
  _displaySearchResults: function(results){
    this.itemsList.empty();

    if (results.artists.length === 0 &&
        results.albums.length === 0 &&
        results.songs.length === 0){
      this._addTitle('Nothing Found');
    }

    if (results.artists.length > 0)
      this._addTitle('Artists');
    this._renderArtists(results.artists);
    if (results.albums.length > 0)
      this._addTitle('Albums');
    this._renderAlbums(results.albums);
    if (results.songs.length > 0)
      this._addTitle('Songs');
    this._renderSongs(results.songs);
  },
  _addTitle: function(title){
    var content = document.createElement('div');
    content.innerHTML = title;
    var uiItem = new UIItem(null, content, null, null);
    uiItem.createDiv();
    uiItem.dom.div.classList.add('subtitle');
    this.itemsList.append(uiItem);
  },
  _renderArtists: function(artists){
    this.fields = ['artist'];
    var itemsToRender = artists.map(this._renderArtist.bind(this));
    itemsToRender.forEach(this.itemsList.append.bind(this.itemsList));
  },
  _renderAlbums: function(albums){
    this.fields = ['album', 'artist'];
    var itemsToRender = albums.map(this._renderAlbum.bind(this));
    itemsToRender.forEach(this.itemsList.append.bind(this.itemsList));
  },
  _renderSongs: function(songs){
    this.fields = ['title', 'artist', 'album'];
    var itemsToRender = songs.map(this._renderSong.bind(this));
    PanelTools.renderItems(this.itemsList, itemsToRender, this.done);
  },
  _renderArtist: function(artist){
    var uiItem = PanelTools.renderGotoPanel({
      song: artist,
      fields: this.fields,
      category: 'Artists',
      ontap: function(){
        var query = {
          'genre': '*',
          'artist': artist.metadata.artist,
          'album': '*',
          'song': '*'
        }
        this.requestMusicPanel(query);
      }.bind(this)
    });
    return uiItem;
  },
  _renderAlbum: function(album){
    var uiItem = PanelTools.renderGotoPanel({
      song: album,
      fields: this.fields,
      category: 'Albums',
      ontap: function(){
        var query = {
          'genre': '*',
          'artist': '*',
          'album': album.metadata.album,
          'song': '*'
        }
        this.requestMusicPanel(query);
      }.bind(this)
    });
    return uiItem;
  },
  _renderSong: function(song){
    var uiItem = PanelTools.renderSong({
      song: song,
      fields: this.fields,
      known: {
        artist: false,
        album: false,
        title: false
      },
      showTrack: false,
      hideAdd: this.mode === 'simple',
      ontap: function(){
        if (this.mode === 'simple'){
          this.requestPlaySongs(song.metadata.title, [song]);
          //TODO should we play all found sounds here?
          //this.requestPlaySongs(song.metadata.title, this.items);
          //var index = this.items.indexOf(song);
          //this.switchPlayingToIndex(index);
        }
        else {
          this.requestAddSongs(song.metadata.title, [song]);
        }
      }.bind(this),
      onlongTap: function(){
        this.requestAddSongsToCustom(song.metadata.title, [song]);
      }.bind(this)
    });
    return uiItem;
  },
}
