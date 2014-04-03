'use strict';

(function(exports) {

  /**
   * LogoLoader loads either a video or image for display during phone boot.
   * Only a single resource will be selected depending on what is availble
   * on the filesystem.
   * @class LogoLoader
   * @param {Object} logoPath Contains file paths for both a video and image.
   */
  function LogoLoader(logoPath) {
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

  LogoLoader.prototype = {

    /**
     * Tries to initialize a video if we can load it from disk.
     * @memberof LogoLoader.prototype
     */
    _initVideo: function() {
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

    /**
     * Tries to initialize an image if we can load it from disk.
     * @memberof LogoLoader.prototype
     */
    _initImage: function() {
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

    /**
     * Called when we have a logo resource ready.
     * @memberof LogoLoader.prototype
     * @param {HtmlElement} element An image or video element.
     */
    _onLogoLoaded: function(element) {
      this.found = true;
      if (!this.ready) {
        this.ready = true;
        this.element = element;
        if (this.onload) {
          this.onload(element);
        }
      }
    }
  };

  exports.LogoLoader = LogoLoader;

}(window));
