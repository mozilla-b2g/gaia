var CurrentMusicPageOptions = function(){
  Utils.loadDomIds(this, [
    "playingPlaylistButtons",
    "savePlaylist",
    "deletePlaylist"
  ]);

  Router.route(this, [
    'savePlaylist',
    'deletePlaylist',
    'clearPlaylist',
    'shufflePlaylist',
    'renamePlaylist',
    'playlistify',
  ]);

  Utils.onButtonTap(this.dom.savePlaylist, this.savePlaylist);

  Utils.onButtonTap(this.dom.deletePlaylist, this.deletePlaylist);

  this.playlistMenu = new Menu({
    'clear': 'clear',
    'shuffle': 'shuffle',
    'rename': 'rename'
  });

  this.playlistMenu.onselect = function(choice){
    if (choice === 'clear'){
      this.clearPlaylist();
    }
    else if (choice === 'shuffle'){
      this.shufflePlaylist();
    }
    else if (choice === 'rename'){
      title = prompt("Playlist Name:");
      if (title !== null && title !== '')
        this.renamePlaylist(title);
    }
  }.bind(this);

  this.simpleMenu = new Menu({
    'turn into playlist': 'playlistify',
  });

  this.simpleMenu.onselect = function(choice){
    if (choice === 'playlistify'){
      title = prompt("Playlist Name:");
      if (title !== null && title !== '')
        this.playlistify(title);
    }
  }.bind(this);

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
  updateMode: function(mode){
    if (mode === 'simple'){
      this.playlistMenu.dom.icon.classList.add('hidden');
      this.simpleMenu.dom.icon.classList.remove('hidden');
    }
    else {
      this.playlistMenu.dom.icon.classList.remove('hidden');
      this.simpleMenu.dom.icon.classList.add('hidden');
    }
  }
}
