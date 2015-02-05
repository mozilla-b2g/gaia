/* global evt */

(function(exports) {
  'use strict';

  function $(id) {
    return document.getElementById(id);
  }

  function VideoPlayer() {
  }

  var proto = evt(VideoPlayer.prototype);

  proto.init = function vp_init() {
    this._player = $('player');
    this._player.mozAudioChannelType = 'content';

    this._player.addEventListener('loadedmetadata', this);
    this._player.addEventListener('seeked', this);
    this._player.addEventListener('waiting', this);
    this._player.addEventListener('playing', this);
    this._player.addEventListener('timeupdate', this);
    this._player.addEventListener('pause', this);
    this._player.addEventListener('ended', this);
    this._player.addEventListener('error', this);
  };

  proto.show = function vp_show() {
    this._player.hidden = false;
  };

  proto.hide = function vp_hide() {
    this._player.hidden = true;
  };

  proto.load = function vp_load(url) {
    this._player.src = url;
  };

  proto.release = function vp_release() {
    this._player.removeAttribute('src');
    this._player.load();
  };

  proto.play = function vp_play() {
    this._player.play();
  };

  proto.pause = function vp_pause() {
    this._player.pause();
  };

  proto.seek = function vp_seek(t) {
    if (!this.loaded) {
      throw new Error('seek-before-loaded');
    }
    this._player.currentTime = t;
  };

  proto.handleEvent = function vp_handleEvent(evt) {
    switch(evt.type) {
      case 'loadedmetadata':
        this.loaded = true;
        this.fire('loaded', {
                              'time': this._player.currentTime,
                              'detail': {
                                'width': this._player.videoWidth,
                                'height': this._player.videoHeight,
                                'length': this._player.duration
                              }
                            });
        break;
      case 'seeked':
        this.fire('seeked', { 'time': this._player.currentTime });
        break;
      case 'waiting':
        this.fire('buffering', { 'time': this._player.currentTime });
        break;
      case 'ended':
      case 'pause':
        this.playing = false;
        this.fire('stopped', { 'time': this._player.currentTime });
        break;
      case 'playing':
        this.playing = true;
        this.show();
        this.fire('buffered', { 'time': this._player.currentTime });
        this.fire('playing', { 'time': this._player.currentTime });
        break;
      case 'timeupdate':
        this.fire('timeupdate', { 'time': this._player.currentTime });
        break;
      case 'error':
        this.fire('error', { 'time': this._player.currentTime,
                             'error': evt.target.error.code });
        break;
    }
  };

  exports.VideoPlayer = VideoPlayer;
})(window);
