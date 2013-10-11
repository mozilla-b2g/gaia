function SongExtraOptions(config){

  this.itemList = config.list;
  this.draggable = config.draggable;

  this.dom = {};

  this.dom.overlay = document.createElement('div');
  this.dom.overlay.classList.add('extra-options-overlay');

  this.dom.content = document.createElement('div');
  this.dom.content.classList.add('extra-options-content');

  this.dom.favorite = document.createElement('div');
  this.dom.favorite.classList.add('extra-options-favorite');
  this.dom.content.appendChild(this.dom.favorite);

  this.dom.share = document.createElement('div');
  this.dom.share.classList.add('extra-options-share');
  this.dom.content.appendChild(this.dom.share);

  this.dom.drag = document.createElement('div');
  this.dom.drag.classList.add('extra-options-drag');
  this.dom.content.appendChild(this.dom.drag);
  this.setDraggable(config.draggable);

  this.dom.add = document.createElement('div');
  this.dom.add.classList.add('extra-options-add');
  this.dom.content.appendChild(this.dom.add);

  var tapManager = new TapManager(this.dom.overlay);
  tapManager.router.when('tap', [this, 'hide']);

  this.clearListener = null;

  this.favoriteTM = null;
  this.addTM = null;
  this.shareTM = null;
  this.dragTM = null;
}

SongExtraOptions.prototype = {
  show: function(config, song){

    this.itemList.appendChild(this.dom.overlay);
    this.itemList.appendChild(this.dom.content);

    this.dom.overlay.style.height = this.itemList.scrollHeight;

    this._updateIsFavorite(song.metadata.favorited);
    this.clearListener = window.musicLibrary.musicDB.registerSongFavoriteChangeListener(song, this._updateIsFavorite.bind(this));

    this.dom.content.style.left = 0;
    this.dom.content.style.top = config.elem.offsetTop;
    this.dom.content.style.height = config.elem.offsetHeight;

    this.favoriteTM = Utils.onButtonTap(this.dom.favorite, config.toggleFavorite);
    this.addTM = Utils.onButtonTap(this.dom.add, config.addTo);
    this.shareTM = Utils.onButtonTap(this.dom.share, config.share);
    if (this.draggable){
      this.dragTM = new TapManager(this.dom.drag);
      this.dragTM.router.when('down', config.drag);
    }

  },
  setDraggable: function(draggable){
    this.draggable = draggable;
    if (this.draggable)
      this.dom.drag.classList.remove('hidden');
    else
      this.dom.drag.classList.add('hidden');
  },
  hide: function(){
    this.dom.overlay.parentNode.removeChild(this.dom.overlay);
    this.dom.content.parentNode.removeChild(this.dom.content);

    if (this.clearListener)
      this.clearListener();

    this.favoriteTM.destroy();
    this.addTM.destroy();
    this.shareTM.destroy();
    if (this.draggable){
      this.dragTM.destroy();
    }
  },
  _updateIsFavorite: function(isFavorite){
    if (isFavorite)
      this.dom.favorite.classList.add('favorited');
    else
      this.dom.favorite.classList.remove('favorited');
  }
}
