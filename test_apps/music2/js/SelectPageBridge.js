var SelectPageBridge = function(){
  this.dom = {};
  this.dom.selectPageDiv = document.getElementById('selectMusicPage');
  
  Utils.setupPassEvent(this, 'enqueueIntoCurrentPlaylist');
  Utils.setupPassEvent(this, 'createTemporaryPlaylistFromSources');
}

SelectPageBridge.prototype = {
  setPageDiv: function(pageDiv){
    this.dom.selectPageDiv.appendChild(pageDiv);
  }
}
