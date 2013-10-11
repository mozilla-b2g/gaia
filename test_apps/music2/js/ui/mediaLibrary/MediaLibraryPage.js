var MediaLibraryPage = function(){//pageBridge){
  Utils.loadDomIds(this, [
      'mediaLibraryPage',
      'visiblePanel',
      'selectSourcePages'
  ]);
  this.dom.page = this.dom.mediaLibraryPage;

  this.notifications = new MediaLibraryPageNotifications();

  this.panelManager = new MediaLibraryPanelManager();//this.musicDB, this.pageBridge);

  this.router = new Router(this);

  this.router.declareRoutes([
    'requestPlaySongs',
    'requestAddSongs',
    'requestAddSongsToCustom',
    'getPlaylists',
    'getPlaylist',
    'registerPlaylistsUpdateListener',
    'registerCurrentPlaylistUpdateListener',
    'registerPlaylistUpdateListener',
    'switchPlaylist',
    'togglePlaylist',
    'deleteItemFromPlaylist',
    'deletePlaylist',
    'shufflePlaylist',
    'renamePlaylist',
    'createPlaylist',
    'copyPlaylist',
    'movePlaylistItemRelative',
    'switchPlayingToIndex',
    'setEdit',
    'shareSong',
    'requestFullRefresh'
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
      if (this.panelManager.panels[0].albums.length === 0){
        this.router.route('requestFullRefresh')();
        this.dom.visiblePanel.classList.add('hidden');
      }
    }.bind(this));

    this.notifications.alert('scanning sd card', 2000);
  },
  setupPanel: function(panel){
    Router.proxy(panel, this, {
      'requestPlaySongs': 'requestPlaySongs',
      'requestAddSongs': 'requestAddSongs',
      'requestAddSongsToCustom': 'requestAddSongsToCustom',
      'switchPlaylist': 'switchPlaylist',
      'togglePlaylist': 'togglePlaylist',

      'deleteItemFromPlaylist': 'deleteItemFromPlaylist',
      'deletePlaylist': 'deletePlaylist',
      'shufflePlaylist': 'shufflePlaylist',
      'renamePlaylist': 'renamePlaylist',
      'createPlaylist': 'createPlaylist',
      'copyPlaylist': 'copyPlaylist',
      'movePlaylistItemRelative': 'movePlaylistItemRelative',

      'switchPlayingToIndex': 'switchPlayingToIndex',

      'setEdit': 'setEdit',
      'shareSong': 'shareSong',
    });

    Router.connect(panel, this, {
      'requestCategoryPanel': 'createCategoryPanel',
      'requestMusicPanel': 'createMusicPanel',
      'requestMusicPanelFromItems': 'createMusicPanelFromItems',
      'requestPlaylistsPanel': 'createPlaylistsPanel',
      'requestPlaylistPanel': 'createPlaylistPanel',
      'requestSearchPanel': 'createSearchPanel',
      'requestDiscoverPanel': 'createDiscoverPanel',
    });

    panel.router.when('pop', [this.panelManager, 'popPanel']);
  },
  createCategoryPanel: function(title, category){
    var panel = new MediaLibraryCategoryPanel(title, category);
    this.setupPanel(panel);
    panel.router.when('ready', function(){
      this.panelManager.pushPanel(panel);
    }.bind(this));
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
    var playlists = this.router.route('getPlaylists')();
    var currentPlaylist = this.router.route('getPlaylist')();
    var panel = new MediaLibraryPlaylistsPanel(playlists, currentPlaylist.playlist, currentPlaylist.playlistId);
    this.router.route('registerPlaylistsUpdateListener')(panel.updatePlaylists.bind(panel));
    this.router.route('registerCurrentPlaylistUpdateListener')(panel.updateCurrentPlaylist.bind(panel));
    this.setupPanel(panel);
    this.panelManager.pushPanel(panel);
  },
  createPlaylistPanel: function(playlist, id){
    var currentPlaylist = this.router.route('getPlaylist')();
    var panel = new MediaLibraryPlaylistPanel(playlist, id, currentPlaylist.playlistId);
    this.router.route('registerPlaylistUpdateListener')(id, panel.updatePlaylist.bind(panel));
    this.router.route('registerCurrentPlaylistUpdateListener')(panel.updateCurrentPlaylist.bind(panel));
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
  displayNoMusic: function(){
    this.notifications.showText('no music found');
  },
  refresh: function(){
    var hideRefreshing = this.showRefreshing();
    this.dom.visiblePanel.classList.add('hidden');
    for (var i = 0; i < this.panelManager.panels.length-1; i++)
      this.panelManager.popPanel();    
    this.createDiscoverPanel(function(){
      this.dom.visiblePanel.classList.remove('hidden');
      hideRefreshing();
    }.bind(this));
  },
  //============== helpers ===============
  showRefreshing: function(){
    this.notifications.alert('refreshing music...');
    return this.notifications.hide.bind(this.notifications);
  },
}
