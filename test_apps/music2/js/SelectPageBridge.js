var SelectPageBridge = function(){
  this.dom = {};
  this.dom.selectPageDiv = document.getElementById('selectMusicPage');
  
  Router.route(this, [
    'enqueueIntoCurrentPlaylist',
    'createTemporaryPlaylistFromSources',
    'enqueueIntoCustomPlaylist',
  ]);
}

SelectPageBridge.prototype = {
  name: "SelectPageBridge",
  setPageDiv: function(pageDiv){
    this.dom.selectPageDiv.appendChild(pageDiv);
  }
}
