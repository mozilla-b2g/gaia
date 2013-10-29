var MediaLibraryAlbumPanel = function(mode, items){

  this.mode = mode;

  PanelTools.setupDom(this);

  //================= album cover =================
  this.dom.albumCover = document.createElement('img');
  this.dom.albumCover.onerror="this.src='';";
  this.dom.albumCover.classList.add('albumCover');
  window.musicLibrary.musicDB.getAlbumArtAsURL(items[0], function(url){
    this.dom.albumCover.src = url;
  }.bind(this));
  this.dom.title.appendChild(this.dom.albumCover);

  //================= title =================
  this.title = items[0].metadata.album || 'Unknown Album';
  PanelTools.setTitle(this, this.title);

  var subtitle = items[0].metadata.artist || 'Unknown Artist';
  PanelTools.setSubtitle(this, subtitle);

  this.dom.titleText.classList.add('right');

  //================= controls =================
  this.dom.controls = document.createElement('div');
  this.dom.controls.classList.add('controls');

  this._setIcons();

  this.dom.title.appendChild(this.dom.controls);

  //================= =================

  this.dom.content.classList.add('album');

  this.items = items;

  this._set();
}

MediaLibraryAlbumPanel.prototype = {
  name: "MediaLibraryAlbumPanel",
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
    this._setIcons();
    this._set();
  },
  //============== helpers ===============
  _setIcons: function(){
    Utils.empty(this.dom.controls);
    if (this.mode !== 'edit'){
      this.dom.play = document.createElement('div');
      this.dom.play.classList.add('play');
      Utils.onButtonTap(this.dom.play, function(){
        this.router.route('requestPlaySongs')(this.title, this.items);
      }.bind(this));
      this.dom.controls.appendChild(this.dom.play);

      this.dom.shuffle = document.createElement('div');
      this.dom.shuffle.classList.add('shuffle');
      Utils.onButtonTap(this.dom.shuffle, function(){
        var itemsShuffled = Utils.copyArray(this.items);
        Utils.shuffleArray(itemsShuffled);
        this.router.route('requestPlaySongs')(this.title, itemsShuffled);
      }.bind(this));
      this.dom.controls.appendChild(this.dom.shuffle);
    }
    else {
      this.dom.add = document.createElement('div');
      this.dom.add.classList.add('add');

      Utils.onButtonLongTap(this.dom.add, function(){
        this.router.route('requestAddSongs')(this.title, this.items);
      }.bind(this), function(){
        this.router.route('requestAddSongsToCustom')(this.title, this.items);
      }.bind(this));
      this.dom.controls.appendChild(this.dom.add);
    }
  },
  _set: function(){
    this._setSongs();
  },
  _setSongs: function(){
    this.itemsList.empty();
    var sortFields = [];
    sortFields.push('artist', 'album', 'tracknum', 'title');

    this.fields = ['title', 'artist', 'album'];

    this.items.sort(PanelTools.makeItemSorter(sortFields));
    var itemsToRender = this.items.map(this._prepRenderListItem.bind(this));

    PanelTools.renderItems(this.itemsList, itemsToRender, this.done);
  },
  _prepRenderListItem: function(song){
    var uiItem = PanelTools.renderSong({
      song: song,
      fields: this.fields,
      known: {
        artist: false,
        album: true,
        title: false
      },
      hideAdd: this.mode !== 'edit',
      showTrack: true,
      ontap: function(){
        if (this.mode !== 'edit'){
          this.router.route('requestPlaySongs')(song.metadata.title, this.items);
          var index = this.items.indexOf(song);
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
