var SelectPageBridge = function(){
  this.dom = {};
  this.dom.selectPageDiv = document.getElementById('selectMusicPage');
  
  Utils.setupPassParent(this, 'enqueueIntoCurrentPlaylist');
  Utils.setupPassParent(this, 'createTemporaryPlaylistFromSources');
  Utils.setupPassParent(this, 'enqueueIntoCustomPlaylist');
}

SelectPageBridge.prototype = {
  setPageDiv: function(pageDiv){
    this.dom.selectPageDiv.appendChild(pageDiv);
  }
}
