var MediaLibraryAllMusicPanel = function(mode, songs){
  PanelTools.setupDom(this);

  this.songs = songs;

  this.mode = mode;

  PanelTools.setTitle(this, 'All Music');

  this._setSongs();
}

MediaLibraryAllMusicPanel.prototype = {
  name: "MediaLibraryAllMusicPanel",
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
      hideAdd: this.mode !== 'edit',
      showTrack: true,
      ontap: function(){
        if (this.mode !== 'edit'){
          this.router.route('requestPlaySongs')(song.metadata.title, [song]);
          //TODO the following is correct but has awful perf
          //this.router.route('requestPlaySongs')(song.metadata.title, this.items);
          //var index = this.items.indexOf(song);
          //this.router.route('switchPlayingToIndex')(index);
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

