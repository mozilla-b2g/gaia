var UI = function() {

  Utils.loadDomIds(this, [
      'gotoCurrentMusicPage',
      'gotoSelectMusicPage',
      'content',
      'toggleCurrentMusicPageView',
      'nowPlayingControls',

  ]);

  this.viewVisibility = new ViewVisibility();
  this.viewEvents = new ViewEvents();

  this.sourcesMetaDrawer = new SourcesMetaDrawer();
  this.playlistDrawer = new PlaylistDrawer();
  this.currentMusicPage = new CurrentMusicPage();

  this.setupEventViewEvents();

  this.viewEvents.onexitDrawer = function(){
    if (this.dom.content.classList.contains('partialRight'))
      this.viewVisibility.toggleMetaDrawer();
    else if (this.dom.content.classList.contains('partialLeft'))
      this.viewVisibility.togglePlaylistDrawer();
  }.bind(this);

  this.currentMusicPage.source.onhideCurrentSourceView = function(){
    this.dom.nowPlayingControls.classList.add('hidden');
    this.dom.toggleCurrentMusicPageView.classList.add('hidden');
    if (!this.dom.toggleCurrentMusicPageView.classList.contains('switchSong')){
      this.viewVisibility.toggleCurrentMusicPageView();
    }
  }.bind(this);

  this.currentMusicPage.source.onshowCurrentSourceView = function(){
    this.dom.nowPlayingControls.classList.remove('hidden');
    this.dom.toggleCurrentMusicPageView.classList.remove('hidden');
  }.bind(this);

}

UI.prototype = {
  setupEventViewEvents: function() {
    var eventViewTable = {
      'ongotoCurrentMusicPage': 'showCurrentMusicPage',
      'ongotoSelectMusicPage': 'showSelectMusicPage',

      'ontoggleMetaDrawer': 'toggleMetaDrawer',
      'ontogglePlaylistDrawer': 'togglePlaylistDrawer',

      'ongotoSettings': 'metaDrawerGotoSettings',
      'ongotoSources': 'metaDrawerGotoSources',

      'ontoggleCurrentMusicPageView': 'toggleCurrentMusicPageView'
    }

    for (var event in eventViewTable){
      this.viewEvents[event] = this.viewVisibility[eventViewTable[event]].bind(this.viewVisibility);
    }
  },
  addPage: function(page, onActivate, onDeactivate){
    this.sourcesMetaDrawer.addSource(page.name, onActivate, onDeactivate);
  },
  activatePage: function(page){
    this.sourcesMetaDrawer.activateSource(page.name);
  }
}

