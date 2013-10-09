var PlaylistView = function(list, hideAlbumArt){
  this.dom = {};
  this.dom.list = list;
  this.dom.list.classList.add('playlistView');

  this.hideAlbumArt = hideAlbumArt;

  this.playlist = new UIItemList(this.dom.list);
  //this.playlist.draggable = true;

  this.playlist.router.when('elemMoved', [this, 'onElemMoved']);

  this.router = new Router(this);

  this.router.declareRoutes([
    'deleteItemFromPlayingPlaylist',
    'switchToPlaylistItem',
    'movePlaylistItemRelative',
    'requestAddSongsToCustom',
    'shareSong'
  ]);

  this.show = this.playlist.show.bind(this.playlist);
  this.hide = this.playlist.hide.bind(this.playlist);

  this.extraOptions = new SongExtraOptions({
    list: this.dom.list,
    draggable: true
  });

  this.currentPlaylist = null;
}

PlaylistView.prototype = {
  name: "PlaylistView",
  destroy: function(){
    this.playlist.destroy();
  },
  setPlaylist: function(playlist, mode){
    this.currentPlaylist = playlist;
    //this.playlist.draggable = mode === 'playlist';
    this.playlist.empty();

    if (playlist === null || playlist === undefined){
      var text = Utils.classDiv('text');
      text.innerHTML = 'no playlist selected:<br>select songs or select a playlist';
      this.dom.list.appendChild(text);
      return;
    }

    if (playlist.list.length === 0){
      var text = Utils.classDiv('text');
      text.textContent = 'playlist empty';
      this.dom.list.appendChild(text);
    }

    for (var i = 0; i < playlist.list.length; i++){
      var source = playlist.list[i];

      var showAlbumArt = true;
      if (i > 0){
        var other = playlist.list[i-1];
        if (other.parentPageName === source.parentPageName){
          showAlbumArt = !source.hasSameAlbumArt(other);
        }
      }
      var item = this.uiItemFromPlaylistItem(source, i+1, showAlbumArt);
      this.playlist.append(item);
      item.dom.div.classList.add('playlistViewItem');
    }
  },
  updateMode: function(mode){
    this.mode = mode;
    this.setPlaylist(this.currentPlaylist, mode);
  },
  setSongState: function(index, state){
    var item = this.playlist.itemByIndex(index);
    if (!item)
      return;
    var stat = item.dom.icon.querySelector('.stat');;
    stat.classList.remove('beingPlayedIcon');
    stat.classList.remove('beingPausedIcon');
    stat.classList.remove('track');
    stat.textContent = '';
    if (state === 'paused'){
      stat.classList.add('beingPausedIcon');
    }
    else if (state === 'playing'){
      stat.classList.add('beingPlayedIcon');
    }
    else {
      stat.classList.add('track');
      stat.textContent = index+1;
    }
  },
  uiItemFromPlaylistItem: function(source, index, showAlbum){
    var content = document.createElement('div');
    var contentText = Utils.classDiv('info');

    if (showAlbum && !this.hideAlbumArt){
      var contentAlbumCover = document.createElement('img');
      contentAlbumCover.src = '';
      contentAlbumCover.classList.add('albumCover');
      source.setAlbumArt(contentAlbumCover);
      content.appendChild(contentAlbumCover);
      contentText.classList.add('albumRight');
    }

    content.appendChild(contentText);
    source.setInfo(contentText);

    var more = null;

    var icon = document.createElement('div');
    icon.classList.add('songInfo');

    var favorited = document.createElement('div');
    favorited.classList.add('favorited');

    var state = source.getState();
    var stat = document.createElement('div');
    stat.classList.add('stat');
    if (state === 'pause'){
      stat.classList.add('beingPausedIcon');
    }
    else if (state === 'play'){
      stat.classList.add('beingPlayedIcon');
    }
    else {
      stat.classList.add('track');
      stat.textContent = index;
    }
    icon.appendChild(stat);
    icon.appendChild(favorited);

    var updateFavorited = function(isFavorite){
      if (isFavorite)
        favorited.classList.add('favorite');
      else 
        favorited.classList.remove('favorite');
    }
    updateFavorited(source.song.metadata.favorited);

    var clearListener = window.musicLibrary.musicDB.registerSongFavoriteChangeListener(source.song, updateFavorited);

    var del = null;
    if (this.mode === 'edit'){
      var del = document.createElement('div');
      del.classList.add('playlistItemDelete');
      Utils.onButtonTap(del, function(){
        this.playlist.remove(item);
        this.router.route('deleteItemFromPlayingPlaylist')(item.index);
      }.bind(this));
    }

    Utils.onButtonLongTap(content, function ontap(){
      this.router.route('switchToPlaylistItem')(item.index);
    }.bind(this), function onlongTap(){
      this.extraOptions.setDraggable(this.mode === 'edit');
      this.extraOptions.show({
        elem: item.dom.div,
        addTo: function (){
          this.router.route('requestAddSongsToCustom')(source.song.metadata.title, [source.song]);
        }.bind(this),
        toggleFavorite: function(){
          window.musicLibrary.musicDB.toggleSongFavorited(source.song);
        },
        drag: function(x, y){
          Utils.remove(this.extraOptions.dom.overlay);
          this.playlist.startDrag(item, x, y, this.extraOptions);
        }.bind(this),
        share: function(){
          this.router.route('shareSong')(source.song);
        }.bind(this)
      }, source.song);
    }.bind(this));


    var item = new UIItem(icon, content, more, del);
    item.data.source = source;
    
    item.on('destroy', function(){
      clearListener();
    });
    //this.setupOnDeleteClick(del, item, source);

    return item;
  },
  destroy: function(){
    
  },
  onElemMoved: function(moveData){
    var item = moveData.item;
    var relativeItem = moveData.relativeItem;
    var relativeDir = moveData.relativeDir;
    this.router.route('movePlaylistItemRelative')(this.currentPlaylist, item.data.source, relativeItem.data.source, relativeDir);
  },
}
