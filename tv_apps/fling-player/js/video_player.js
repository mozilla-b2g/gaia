(function(exports) {
  'use strict';

  /**
   * This class is a thin wrapper of HTMLVideoElement
   * @param {HTMLVideoElement}
   */
  function VideoPlayer(video) {
    this._video = video;
  }

  var proto = VideoPlayer.prototype;

  proto.init = function vp_init() {
    this._video.mozAudioChannelType = 'content';

    this._isLoaded = false;
    this._isPlaying = false;

    this._video.addEventListener('loadedmetadata', this);
    this._video.addEventListener('playing', this);
    this._video.addEventListener('pause', this);
    this._video.addEventListener('ended', this);
  };

  proto.getVideo = function () {
    return this._video;
  };

  proto.addEventListener = function (type, handle) {
    return this._video.addEventListener(type, handle);
  };

  proto.show = function vp_show() {
    this._video.hidden = false;
  };

  proto.hide = function vp_hide() {
    this._video.hidden = true;
  };

  proto.load = function vp_load(url) {
    this._video.src = url;
  };

  proto.release = function vp_release() {
    this._video.pause();
    this._video.removeAttribute('src');
    this._video.load();
  };

  proto.play = function vp_play() {
    this._video.play();
  };

  proto.pause = function vp_pause() {
    this._video.pause();
  };

  proto.seek = function vp_seek(t) {
    if (!this._isLoaded) {
      return;
    }
    this._video.currentTime = t;
  };

  proto.isPlaying = function () {
    return this._isPlaying;
  };

  /**
   * @param {Integer} The time length in sec
   * @return {Object} One object carrys the pared time value:
   *                  - hh : hour
   *                  - mm : minute
   *                  - ss : sec
   */
  proto.parseTime = function (sec) {

    var t = {},
        s = +sec;

    if ((s > 0) === false) {
      s = 0;
    }

    t.ss = s % 3600 % 60;

    s -= t.ss;

    t.mm = (s % 3600) / 60;

    s -= t.mm * 60;

    t.hh = s / 3600;

    return t;
  };

  proto.handleEvent = function vp_handleEvent(evt) {

    switch(evt.type) {
      case 'loadedmetadata':
        this._isLoaded = true;
      break;

      case 'playing':
        this._isPlaying = true;
        this.show();
      break;

      case 'seeked':
        this.play();
      break;

      case 'ended':
      case 'pause':
        this._isPlaying = false;
      break;
    }
  };

  exports.VideoPlayer = VideoPlayer;
})(window);