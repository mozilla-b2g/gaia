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

    this._video.addEventListener('loadedmetadata', this);
    this._video.addEventListener('playing', this);
  };

  proto.getVideo = function () {
    return this._video;
  };

  /**
   * @return {Number} The rounded video duration in sec.
   *                  Please read the video's duration property if
   *                  require accurate to the decimal place.
   */
  proto.getRoundedDuration = function () {
    var s = Math.round(this._video.duration);
    return isNaN(s) ? 0 : s;
  };

  /**
   * @return {Number} The rounded current video time in sec.
   *                  Please read the video's currentTime property if
   *                  require accurate to the decimal place.
   */
  proto.getRoundedCurrentTime = function () {
    var s = Math.round(this._video.currentTime);
    return isNaN(s) ? 0 : s;
  };

  proto.show = function () {
    this._video.hidden = false;
  };

  proto.hide = function () {
    this._video.hidden = true;
  };

  proto.load = function (url) {
    this._video.src = url;
    this._video.load();
  };

  proto.release = function () {
    this._video.pause();
    this._video.removeAttribute('src');
    this._video.load();
  };

  proto.play = function () {
    this._video.play();
  };

  proto.pause = function () {
    this._video.pause();
  };

  proto.seek = function (t) {
    if (!this._isLoaded) {
      return;
    }
    this._video.currentTime = t;
  };

  proto.isPlaying = function () {
    return !this._video.paused && !this._video.ended;
  };

  /**
   * @param {Number} sec The time length in sec
   * @return {Object} One object carrys the pared time value:
   *                  - hh : hour
   *                  - mm : minute
   *                  - ss : sec
   */
  proto.parseTime = function (sec) {

    var t = {},
        s = Math.round(sec);

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

  proto.handleEvent = function (evt) {

    switch(evt.type) {
      case 'loadedmetadata':
        this._isLoaded = true;
      break;

      case 'playing':
        this.show();
      break;
    }
  };

  exports.VideoPlayer = VideoPlayer;

})(window);
