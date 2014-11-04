'use strict';

  function VideoLoadingChecker(player, overlay, overlayTitle, overlayText) {
    this.player = player;
    this.overlay = overlay;
    this.overlayTitle = overlayTitle;
    this.overlayText = overlayText;
  }

  VideoLoadingChecker.prototype = {

    ensureVideoLoads: function vpc_ensureVideoLoads(callback) {
      var videoLoadedTimoutId = null;
      var self = this;

      function handleLoadedMetadata() {

        // Video was loaded, don't display the 'video could not be loaded'
        // overlay (or hide it).
        clearTimeout(videoLoadedTimoutId);
        videoLoadedTimoutId = null;
        self.player.removeEventListener('loadedmetadata', handleLoadedMetadata);
        self.overlay.classList.add('hidden'); // Hide the error overlay
        if (callback) {
          callback();
        }
      }

      this.player.addEventListener('loadedmetadata', handleLoadedMetadata);

      videoLoadedTimoutId = setTimeout(function() {

        // Display the error overlay
        self.overlayTitle.setAttribute('data-l10n-id',
                                       'video-hardware-in-use-title');
        self.overlayText.setAttribute('data-l10n-id',
                                      'video-hardware-in-use-text');
        self.overlay.classList.remove('hidden');
      }, 500);
    }
  };

