/*
 * Bug 1079519: If a WebRTC call (from the Hello app) is running in the
 * background, then the video decoding hardware may be in use, and the video
 * app will not be able to play h264 videos that require hardware decoding.
 * The <video> element does not have any way to report this condition currently
 * and instead just sits and waits its turn to use the hardware.
 *
 * This modules is a hacky workaround: if we do not get loadedmetadata
 * or timeupdate events quickly enough we assume that the video
 * hardware is in use and display an error message to the user.
 *
 * Bug 1093283 has been filed for a real fix to the video element and
 * if we get that fix, then we can check for this 'hardware in use'
 * condition explicitly and can remove this hack.
 */
(function(exports) {
  'use strict';

  exports.VideoLoadingChecker = VideoLoadingChecker;

  function VideoLoadingChecker(player, overlay, overlayTitle, overlayText) {
    this.player = player;
    this.overlay = overlay;
    this.overlayTitle = overlayTitle;
    this.overlayText = overlayText;
  }

  VideoLoadingChecker.prototype = {

    ensureVideoLoads: function vpc_ensureVideoLoads(callback) {
      var self = this;
      var videoLoadedTimeoutId = setTimeout(showOverlay.bind(null, this), 1500);
      this.player.addEventListener('loadedmetadata', handleLoadedMetadata);

      function handleLoadedMetadata() {

        // Video was loaded, don't display the 'video could not be loaded'
        // overlay (or hide it).
        clearTimeout(videoLoadedTimeoutId);
        videoLoadedTimeoutId = null;
        self.player.removeEventListener('loadedmetadata', handleLoadedMetadata);
        hideOverlay(self);
        if (callback) {
          callback();
        }
      }
    },

    ensureVideoPlays: function() {
      this.playingTimeout = setTimeout(showOverlay.bind(null, this), 1500);
      this.playingListener = this.cancelEnsureVideoPlays.bind(this);
      // When the video hardware is in use, we still get a playing event
      // after calling play(). So to ensure that playback is actually
      // happening, we listen for a timeupdate event instead.
      this.player.addEventListener('timeupdate', this.playingListener);
    },

    cancelEnsureVideoPlays: function() {
      hideOverlay(this);
      if (this.playingTimeout) {
        clearTimeout(this.playingTimeout);
        this.playingTimeout = null;
      }
      if (this.playingListener) {
        this.player.removeEventListener('timeupdate', this.playingListener);
        this.playingListener = null;
      }
    }
  };

  function showOverlay(checker) {
    checker.overlayTitle.setAttribute('data-l10n-id',
                                       'video-hardware-in-use-title');
    checker.overlayText.setAttribute('data-l10n-id',
                                     'video-hardware-in-use-text');
    checker.overlay.classList.remove('hidden');
    document.body.classList.add('in-use-overlay');
  }

  function hideOverlay(checker) {
    document.body.classList.remove('in-use-overlay');
    checker.overlay.classList.add('hidden');
  }

}(window));
