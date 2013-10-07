var CurrentMusicPageOptions = function(){
  Utils.loadDomIds(this, [
    "playingPlaylistButtons",
    "savePlaylist",
    "deletePlaylist"
  ]);

  this.router = new Router(this);

  this.router.declareRoutes([
    'savePlaylist',
    'deletePlaylist',
    'clearPlaylist',
    'shufflePlaylist',
    'renamePlaylist',
    'playlistify',
    'closePlaylist',
    'setEdit'
  ]);

  Utils.onButtonTap(this.dom.savePlaylist, this.router.route('savePlaylist'));

  Utils.onButtonTap(this.dom.deletePlaylist, this.router.route('deletePlaylist'));

  this.playlistMenu = new Menu({
    'clear': 'clear',
    'shuffle': 'shuffle',
    'rename': 'rename',
    'close': 'close'
  });

  var edit = new Checkable("edit");
  this.playlistMenu.dom.list.appendChild(edit.dom.checkable);

  edit.when.setChecked = function(checked){
    if (checked)
      this.router.route('setEdit')(true);
    else
      this.router.route('setEdit')(false);
  }.bind(this)

  this.playlistMenu.router.when('select', function(choice){
    if (choice === 'clear'){
      this.router.route('clearPlaylist')();
    }
    else if (choice === 'shuffle'){
      this.router.route('shufflePlaylist')();
    }
    else if (choice === 'rename'){
      title = prompt("Playlist Name:");
      if (title !== null && title !== '')
        this.router.route('renamePlaylist')(title);
    }
    else if (choice === 'close'){
      this.router.route('closePlaylist')();
    }
  }.bind(this));

  this.simpleMenu = new Menu({
    'turn into user playlist': 'playlistify',
    'close': 'close'
  });

  this.simpleMenu.router.when('select', function(choice){
    if (choice === 'playlistify'){
      title = prompt("Playlist Name:");
      if (title !== null && title !== '')
        this.router.route('playlistify')(title);
    }
    else if (choice === 'close'){
      this.router.route('closePlaylist')();
    }
  }.bind(this));

  this.dom.playingPlaylistButtons.appendChild(this.playlistMenu.dom.icon);
  this.dom.playingPlaylistButtons.appendChild(this.simpleMenu.dom.icon);
}

CurrentMusicPageOptions.prototype = {
  name: "CurrentMusicPageOptions",
  showSave: function(){
    this.dom.savePlaylist.classList.remove('hidden');
    this.dom.deletePlaylist.classList.remove('hidden');
    this.dom.playingPlaylistButtons.classList.add('big');
  },
  hideSave: function(){
    this.dom.savePlaylist.classList.add('hidden');
    this.dom.deletePlaylist.classList.add('hidden');
    this.dom.playingPlaylistButtons.classList.remove('big');
  },
  setPlaylistId: function(playlistId){
    this.playlistId = playlistId;
    this._setMenu();
  },
  updateMode: function(mode){
    this.mode = mode;
    this._setMenu();
  },
  _setMenu: function(){
    if (this.mode === 'simple' || this.playlistId === 'favorites'){
      this.playlistMenu.dom.icon.classList.add('hidden');
      this.simpleMenu.dom.icon.classList.remove('hidden');
    }
    else {
      this.playlistMenu.dom.icon.classList.remove('hidden');
      this.simpleMenu.dom.icon.classList.add('hidden');
    }
  }
}
