var MediaLibraryPagePanelManager = function(musicDB, pageBridge){
  this.musicDB = musicDB;
  this.pageBridge = pageBridge;
  Utils.loadDomIds(this, [
      "mediaLibraryPagePanelTitleText",
      "mediaLibraryPagePanelPop",
      "mediaLibraryPagePanelControlPlay",
      "mediaLibraryPagePanelControlAdd"
  ]);
  this.dom.titleText = this.dom.mediaLibraryPagePanelTitleText;

  Utils.onButtonTap(this.dom.mediaLibraryPagePanelPop, this.popPanel.bind(this));

  Utils.onButtonTap(this.dom.mediaLibraryPagePanelControlPlay, this.playAll.bind(this));

  Utils.onButtonLongTap(this.dom.mediaLibraryPagePanelControlAdd, 
                        this.add.bind(this), this.addToCustom.bind(this));

  this.preppingPanel = false;
  this.panelView = null;
  this.currentPanel = null;

  this.panels = [];
}

MediaLibraryPagePanelManager.prototype = {
  pushPanel: function(panel, done){
    if (this.preppingPanel)
      return;
    this.panels.push(panel);
    this.setPanel(panel, done);
  },
  refresh: function(done){
    if (this.preppingPanel)
      return;
    this.setPanel(this.currentPanel, done);
  },
  popPanel: function(){
    if (this.preppingPanel)
      return;
    if (this.panels.length > 1){
      var oldPanel = this.panels.pop();
      if (oldPanel && oldPanel.onunload)
        oldPanel.onunload();
      this.setPanel(this.panels[this.panels.length-1]);
    }
  },
  add: function(){
    var sources = [];
    for (var i = 0; i < this.panelView.songs.length; i++){
      var song = this.panelView.songs[i];
      var source = new FileAudioSource(this.musicDB, song);
      sources.push(source);
    }
    this.pageBridge.enqueueIntoCurrentPlaylist(this.panelView.currentTitle, sources);
  },
  addToCustom: function(){
    var sources = [];
    for (var i = 0; i < this.panelView.songs.length; i++){
      var song = this.panelView.songs[i];
      var source = new FileAudioSource(this.musicDB, song);
      sources.push(source);
    }
    this.pageBridge.enqueueIntoCustomPlaylist(this.panelView.currentTitle, sources);
  },
  playAll: function(){
    var sources = [];
    for (var i = 0; i < this.panelView.songs.length; i++){
      var song = this.panelView.songs[i];
      var source = new FileAudioSource(this.musicDB, song);
      sources.push(source);
    }
    this.pageBridge.createTemporaryPlaylistFromSources(this.panelView.currentTitle, sources);
  },
  setPanel: function(panel, done){
    if (this.panelView)
      this.panelView.inactive = true;
    this.currentPanel = panel;
    this.panelView = new MediaLibraryPagePanelView(this.musicDB, panel, done, this.changePanel.bind(this));
    this.panelView.ongotoSubcategory = this.gotoSubcategoryPanel.bind(this);
    this.panelView.ongotoItem = this.gotoItemPanel.bind(this);
    this.panelView.onplaySong = this.playSong.bind(this);
    this.panelView.onaddSong = this.addSong.bind(this);
    this.panelView.onaddSongToCustom = this.addSongToCustom.bind(this);
    this.preppingPanel = true;
  },
  changePanel: function(){
    this.panelView.setPanel();
    this.preppingPanel = false;
    if (this.panels.length === 1)
      this.dom.mediaLibraryPagePanelPop.classList.add('hidden');
    else
      this.dom.mediaLibraryPagePanelPop.classList.remove('hidden');
  },
  gotoSubcategoryPanel: function(subCategory){
    var newPanel = this.currentPanel.getSubcategoryPanel(subCategory);
    this.pushPanel(newPanel);
  },
  gotoItemPanel: function(item, selectOverride){
    var newPanel = this.currentPanel.getItemPanel(item, selectOverride);
    this.pushPanel(newPanel);
  },
  playSong: function(song){
    var source = new FileAudioSource(this.musicDB, song);
    this.pageBridge.createTemporaryPlaylistFromSources(song.metadata.title, [ source ]);
  },
  addSong: function(song){
    var source = new FileAudioSource(this.musicDB, song);
    this.pageBridge.enqueueIntoCurrentPlaylist(song.metadata.title, [ source ]);
  },
  addSongToCustom: function(song){
    var source = new FileAudioSource(this.musicDB, song);
    this.pageBridge.enqueueIntoCustomPlaylist(song.metadata.title, [ source ]);
  },
}
