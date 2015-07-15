'use strict';

/* exported MockIconsHelper */

var MockIconsHelper = {
  getIcon: function() {
    return new Promise(resolve => { resolve(); });
  },

  getIconBlob: function() {},

  getBestIconFromWebManifest: function() {},

  getBestIconFromMetaTags: function() {},

  fetchIcon: function() {},

  clear: function() {}
};
