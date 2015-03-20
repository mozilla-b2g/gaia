'use strict';

/* exported MockWebManifestHelper */
var MockWebManifestHelper = {
  getManifest: function(manifestURL) {
    return Promise.resolve({'short_name': 'App', 'name': 'My App'});
  },

  iconURLForSize: function(manifest, manifestURL, size) {
    return new URL('http://example.com/icon.png');
  }
};
