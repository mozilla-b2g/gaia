var MediaLibraryAllMusicPanel = function(mode, songs){
  PanelTools.setupDom(this);

  this.songs = songs;

  this.mode = mode;

  var mainTitle = document.createElement('div');
  mainTitle.innerHTML = 'All Music';
  this.dom.titleText.appendChild(mainTitle);

  Router.route(this, [
    'requestPlaySongs',
    'requestAddSongs',
    'requestAddSongsToCustom'
  ]);

  this._setSongs();
}

MediaLibraryAllMusicPanel.prototype = {
  name: "MediaLibraryAllMusicPanel",
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
    this._setSongs();
  },
  //============== helpers ===============
  _setSongs: function(){
    this.itemsList.empty();
    var sortFields = [];
    sortFields.push('artist');

    this.fields = ['title', 'artist', 'album'];

    var itemsToRender = this.songs.map(this._prepSong.bind(this));
    PanelTools.renderItems(this.itemsList, itemsToRender, this.done);
  },
  _prepSong: function(song){
    var uiItem = PanelTools.renderSong({
      song: song,
      fields: this.fields,
      known: {
        artist: false,
        album: false,
        title: false
      },
      hideAdd: this.mode === 'simple',
      showTrack: true,
      ontap: function(){
        if (this.mode === 'simple'){
          this.requestPlaySongs(song.metadata.title, [song]);
          //TODO the following is correct but has awful perf
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
  }
}

