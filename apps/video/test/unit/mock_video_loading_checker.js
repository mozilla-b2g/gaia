'use strict';

  function VideoLoadingChecker(player, overlay, overlayTitle, overlayText) {
    this.player = player;
    this.overlay = overlay;
    this.overlayTitle = overlayTitle;
    this.overlayText = overlayText;
    this.callback = null;
  }

  VideoLoadingChecker.prototype = {

    ensureVideoLoads: function vpc_ensureVideoLoads(callback) {
      this.callback = callback;
    },
    invokeLoadedMetadataCallback: function vpc_invokeLoadedMetadataCallback() {
      if (this.callback) {
        this.callback();
      }
    },
    resetLoadedMetadataCallback: function vpc_resetLoadedMetadataCallback() {
      this.callback = null;
    },
    ensureVideoPlays: function() {},
    cancelEnsureVideoPlays: function() {},
  };

