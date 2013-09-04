'use strict';

var LogoLoader = (function(window) {
  function ll_LogoLoader(logoPath) {
    // Load video / image if exist.
    // Only one of them should success.  We load both of them at the same time.
    this.videoPath = logoPath.video;
    this.imagePath = logoPath.image;

    this._noImage = false;
    this._noVideo = false;
    //Statuses
    this.ready = false;
    this.found = false;

    this.element = null;
    //Callback functions
    this.onnotfound = null;
    this.onload = null;

    this._initVideo();
    this._initImage();
  }

  ll_LogoLoader.prototype = {
    _initVideo: function ll_initVideo() {
      var video = document.createElement('video');
      video.preload = 'auto';
      video.src = this.videoPath;
      var self = this;
      video.onloadeddata = function() {
        self._onLogoLoaded(video);
      };
      video.onerror = function() {
        self._noVideo = true;
        if (self._noImage && (typeof self.onnotfound == 'function')) {
          self.ready = true;
          self.onnotfound();
        }
      };
    },

    _initImage: function ll_initImage() {
      var self = this;
      var img = new Image();
      img.src = this.imagePath;
      img.onload = function() {
        self._onLogoLoaded(img);
      };
      img.onerror = function() {
        self._noImage = true;
        if (self._noVideo && (typeof self.onnotfound == 'function')) {
          self.ready = true;
          self.onnotfound();
        }
      };
    },

    _onLogoLoaded: function ll_onLogoLoaded(element) {
      this.found = true;
      if (!this.ready) {
        this.ready = true;
        this.element = element;
        if (this.onload)
          this.onload(element);
      }
    }
  };

  return ll_LogoLoader;
}());
