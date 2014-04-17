'use strict';

const Cu = Components.utils;

(function(exports) {
  if ('MozReflowAtom' in exports) {
    return;
  }

  exports.MozReflowAtom = {
    count: null,
    _trackingManifest: null,

    init: function rw_init() {
      exports.addEventListener('developer-hud-update', this);
    },

    handleEvent: function rw_handleEvent(evt) {
      var metric = evt.detail.metric.name || evt.detail.metric;
      if (metric !== 'reflows' ||
          evt.detail.manifest !== this._trackingManifest) {
        return;
      }
      this.count++;
    },

    startTracking: function(manifestURL) {
      this._trackingManifest = manifestURL;
      this.count = 0;
    },

    stopTracking: function() {
      this.count = 0;
      this._trackingManifest = null;
    },
  };

  exports.MozReflowAtom.init();
})(window);
