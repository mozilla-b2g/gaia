var MediaLibraryPage = function(){//pageBridge){
  Utils.loadDomIds(this, [
      'mediaLibraryPage',
      'selectSourcePages'
  ]);
  this.dom.page = this.dom.mediaLibraryPage;

  this.notifications = new MediaLibraryPageNotifications();

  this.panelManager = new MediaLibraryPanelManager();//this.musicDB, this.pageBridge);

  Router.route(this, [
    'requestPlaySongs',
    'requestAddSongs',
    'requestAddSongsToCustom',
    'getPlaylists',
    'getPlaylist',
    'registerPlaylistsUpdateListener',
    'registerCurrentPlaylistUpdateListener',
    'registerPlaylistUpdateListener',
    'switchPlaylist',
    'deleteItemFromPlaylist',
    'deletePlaylist',
    'shufflePlaylist',
    'renamePlaylist',
    'createPlaylist',
    'copyPlaylist',
    'movePlaylistItemRelative',
    'switchPlayingToIndex',
  ]);


}

MediaLibraryPage.prototype = {
  name: "MediaLibraryPage",
  //============== API ===============
  setLoading: function(){

  },
  setDoneLoading: function(){
    this.dom.page.classList.add('hidden');
    var mainPanel = new MediaLibraryMainPanel();
    this.setupPanel(mainPanel);
    this.panelManager.pushPanel(mainPanel);

    this.createDiscoverPanel(function(){
      this.dom.page.classList.remove('hidden');
    }.bind(this));

    this.notifications.alert('scanning sd card', 2000);
  },
  setupPanel: function(panel){
    panel.onrequestCategoryPanel = this.createCategoryPanel.bind(this);
    panel.onrequestMusicPanel = this.createMusicPanel.bind(this);
    panel.onrequestMusicPanelFromItems = this.createMusicPanelFromItems.bind(this);
    panel.onrequestPlaylistsPanel = this.createPlaylistsPanel.bind(this);
    panel.onrequestPlaylistPanel = this.createPlaylistPanel.bind(this);
    panel.onrequestSearchPanel = this.createSearchPanel.bind(this);
    panel.onrequestDiscoverPanel = this.createDiscoverPanel.bind(this);

    panel.onrequestPlaySongs = this.requestPlaySongs.bind(this);
    panel.onrequestAddSongs = this.requestAddSongs.bind(this);
    panel.onrequestAddSongsToCustom = this.requestAddSongsToCustom.bind(this);
    panel.onswitchPlaylist = this.switchPlaylist.bind(this);

    panel.ondeleteItemFromPlaylist = this.deleteItemFromPlaylist.bind(this);
    panel.ondeletePlaylist = this.deletePlaylist.bind(this);
    panel.onshufflePlaylist = this.shufflePlaylist.bind(this);
    panel.onrenamePlaylist = this.renamePlaylist.bind(this);
    panel.oncreatePlaylist = this.createPlaylist.bind(this);
    panel.oncopyPlaylist = this.copyPlaylist.bind(this);
    panel.onmovePlaylistItemRelative = this.movePlaylistItemRelative.bind(this);

    panel.onswitchPlayingToIndex = this.switchPlayingToIndex.bind(this);

    panel.onpop = this.panelManager.popPanel.bind(this.panelManager);
  },
  createCategoryPanel: function(title, category){
    var panel = new MediaLibraryCategoryPanel(title, category);
    this.setupPanel(panel);
    panel.onready = function(){
      this.panelManager.pushPanel(panel);
    }.bind(this);
  },
  createMusicPanel: function(query){
    window.musicLibrary.musicDB.getSongs(
      query.genre, query.artist, query.album, 
      function(items){
        this.createMusicPanelFromItems(query, items);
      }.bind(this));
  },
  createMusicPanelFromItems: function(query, items){
    var panel = MediaLibraryMusicPanelFactory.createMediaLibraryMusicPanel(query, items, this.mode);
    this.setupPanel(panel);
    this.panelManager.pushPanel(panel);
  },
  createPlaylistsPanel: function(){
    var playlists = this.getPlaylists();
    var currentPlaylist = this.getPlaylist();
    var panel = new MediaLibraryPlaylistsPanel(playlists, currentPlaylist.playlist, currentPlaylist.playlistId);
    this.registerPlaylistsUpdateListener(panel.updatePlaylists.bind(panel));
    this.registerCurrentPlaylistUpdateListener(panel.updateCurrentPlaylist.bind(panel));
    this.setupPanel(panel);
    this.panelManager.pushPanel(panel);
  },
  createPlaylistPanel: function(playlist, id){
    var panel = new MediaLibraryPlaylistPanel(playlist, id);
    this.registerPlaylistUpdateListener(id, panel.updatePlaylist.bind(panel));
    this.setupPanel(panel);
    this.panelManager.pushPanel(panel);
  },
  createSearchPanel: function(){
    var panel = new MediaLibrarySearchPanel(this.mode);
    this.setupPanel(panel);
    this.panelManager.pushPanel(panel);
  },
  createDiscoverPanel: function(done){
    window.musicLibrary.musicDB.getAlbums(
      '*', '*', 
      function(items){
        items = Utils.copyArray(items);
        Utils.shuffleArray(items);
        items.splice(9, Math.max(items.length-10, 0));
        var panel = new MediaLibraryDiscoverPanel(items);
        this.setupPanel(panel);
        this.panelManager.pushPanel(panel);
        if (done)
          done();
      }.bind(this));
  },
  updateMode: function(mode){
    this.mode = mode;
    this.panelManager.updateMode(mode);
  },
  notifySongRemoved: function(song){
    this.notifications.alert('removed: ' + song.metadata.title, 2000);
  },
  notifySongFound: function(song){
    this.notifications.alert('found: ' + song.metadata.title, 2000);
  },
  userWantRefresh: function(numberCreated, numberDeleted, refresh){
      this.notifications.askForRefresh(numberCreated, numberDeleted, refresh);
  },
  refresh: function(){
    var hideRefreshing = this.showRefreshing();
    this.panelManager.refresh(hideRefreshing);
  },
  //============== helpers ===============
  showRefreshing: function(){
    this.notifications.alert('refreshing music...');
    return this.notifications.hide.bind(this.notifications);
  },
}
