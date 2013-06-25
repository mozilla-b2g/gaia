
var Music = function() {

  //window.router = new Router('DEBUG');
  window.router = new Router();
  window.router.on('unserialize', this.unserializeSource.bind(this));

  this.selectPagesByName = {};
  this.currentSelectPage = null;

  this.ui = new UI();
  
  this.selectPageBridge = new SelectPageBridge();

  this.loadSelectPages();

  this.playlistManager = new PlaylistManager(this.ui.currentMusicPage, this.ui.playlistDrawer);

  this.selectPageBridge.onenqueueIntoCurrentPlaylist = this.playlistManager.appendAudioSourcesToCurrent.bind(this.playlistManager);
  this.selectPageBridge.oncreateTemporaryPlaylistFromSources = this.playlistManager.createTemporaryPlaylistFromSources.bind(this.playlistManager);

  var startPageName = 'Music Library';
  if (window.localStorage.lastPageName !== undefined &&
    this.selectPagesByName[window.localStorage.lastPageName] !== undefined){
    startPageName = window.localStorage.lastPageName;
  }

  var startPage = this.selectPagesByName[startPageName];
  this.currentSelectPage = startPage;
  this.ui.activatePage(startPage);

  //this.ui.viewVisibility.showCurrentMusicPage();
  //setTimeout(this.ui.viewVisibility.toggleCurrentMusicPageView.bind(this.ui.viewVisibility), 1000);
  //setTimeout(this.ui.viewVisibility.togglePlaylistDrawer.bind(this.ui.viewVisibility), 1000);
}

Music.prototype = {
  //==========================
  //  Pages
  //==========================
  loadSelectPages: function(){
    var pageNames = [
      'MediaLibraryPage',
      'FMRadioPage',
      'InternetRadioPage'
    ];

    for (var i = 0; i < pageNames.length; i++){
      var pageName = pageNames[i];
      var Page = window[pageName];
      var page = new Page(this.selectPageBridge);
      this.loadPage(page);
    }
  },
  loadPage: function(page){
    this.selectPagesByName[page.name] = page;

    this.ui.addPage(
      page,
      function onActivate(){
        page.activate();
        window.localStorage.lastPageName = page.name;
        setTimeout(function(){
          this.ui.viewVisibility.hideMetaDrawer();
        }.bind(this), 250);
      }.bind(this),
      function onDeactivate(){
        page.deactivate();
      }.bind(this));
  },
  //==========================
  //  playlist controls
  //==========================
  unserializeSource: function(serializedSource){
    return this.selectPagesByName[serializedSource.parentPageName].unserialize(serializedSource.data);
  }
}

window.addEventListener('load', function() new Music() );
