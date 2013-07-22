
var Music = function() {

  //window.router = new Router('DEBUG');
  window.router = new Router();
  window.router.on('unserialize', this.unserializeSource.bind(this));

  this.selectPagesByName = {};
  this.currentSelectPage = null;

  this.ui = new UI();
  
  this.selectPageBridge = new SelectPageBridge();

  this.mediaLibraryPage = new MediaLibraryPage(this.selectPageBridge);

  this.playlistManager = new PlaylistManager(this.ui.currentMusicPage, this.ui.playlistDrawer);

  this.selectPageBridge.onenqueueIntoCurrentPlaylist = this.playlistManager.appendAudioSourcesToCurrent.bind(this.playlistManager);
  this.selectPageBridge.oncreateTemporaryPlaylistFromSources = this.playlistManager.createTemporaryPlaylistFromSources.bind(this.playlistManager);
  this.selectPageBridge.onenqueueIntoCustomPlaylist = this.playlistManager.ui.enqueueIntoCustomPlaylist.bind(this.playlistManager.ui);

  //on error, reset img src
  var imgs = document.getElementsByTagName('img');
  for (var i = 0; i < imgs.length; i++){
    var img = imgs[i];
    (function(img){
      img.onerror = function(){
        img.src = '';
      };
    })(img);
  }
  
  //this.ui.viewVisibility.showCurrentMusicPage();
  //setTimeout(function(){
  //  this.ui.viewVisibility.togglePlaylistDrawer();
  //}.bind(this), 750);

}

Music.prototype = {
  unserializeSource: function(serializedSource){
    return this.mediaLibraryPage.unserialize(serializedSource.data);
  },
}

window.addEventListener('load', function() new Music() );
