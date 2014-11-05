'use strict';

function PlayerView() {
  Utils.loadDomIds(this, [
    'player-controls-previous',
    'player-controls-play',
    'player-controls-next',
    'player-cover-image'
  ]);

  this.router = new Router(this);
  this.router.declareRoutes([
    'play',
    'pause',
    'playPrev',
    'playNext'
  ]);

  this.seekBar = new SeekBar();
  this.seekBar.enable();

  this.dom.playerControlsPlay.onclick = (function() {
    if (this.dom.playerControlsPlay.classList.contains('is-pause')) {
      this.router.route('play')();
    }
    else {
      this.router.route('pause')();
    }
    this.dom.playerControlsPlay.classList.toggle('is-pause');
  }).bind(this);

  this.dom.playerControlsNext.onclick = this.router.route('playNext');
  this.dom.playerControlsPrevious.onclick = this.router.route('playPrev');
}

PlayerView.prototype = {
  name: 'PlayerView',
  //============== API ===============
  show: function() {

  },
  hide: function() {

  },
  setPlaylist: function(playlist) {
    this.dom.playerControlsPlay.classList.remove('is-pause');
    if (playlist.list[0]) {
      window.musicLibrary.musicDB.getAlbumArtAsURL(playlist.list[0].song,
        function(url) {
          this.dom.playerCoverImage.style.backgroundImage = 'url(' + url + ')';
        }.bind(this)
      );
    }
  }
  //============== helpers ===============
};
