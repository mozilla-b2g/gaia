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
  Utils.onButtonTap(this.dom.mediaLibraryPagePanelControlAdd, this.add.bind(this));

  this.panelView = null;
  this.currentPanel = null;

  this.panels = [];
}

MediaLibraryPagePanelManager.prototype = {
  pushPanel: function(panel){
    this.panels.push(panel);
    this.setPanel(panel);
    if (this.panels.length > 1)
      this.dom.mediaLibraryPagePanelPop.classList.remove('hidden');
  },
  refresh: function(done){
    this.setPanel(this.currentPanel, done);
  },
  popPanel: function(){
    if (this.panels.length > 1){
      var oldPanel = this.panels.pop();
      if (oldPanel && oldPanel.onunload) 
        oldPanel.onunload();
      this.setPanel(this.panels[this.panels.length-1]);
      if (this.panels.length === 1)
        this.dom.mediaLibraryPagePanelPop.classList.add('hidden');
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
    this.panelView = new MediaLibraryPagePanelView(this.musicDB, panel, done);
    this.panelView.ongotoSubcategory = this.gotoSubcategoryPanel.bind(this);
    this.panelView.ongotoItem = this.gotoItemPanel.bind(this);
    this.panelView.onplaySong = this.playSong.bind(this);
    this.panelView.onaddSong = this.addSong.bind(this);
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
}
