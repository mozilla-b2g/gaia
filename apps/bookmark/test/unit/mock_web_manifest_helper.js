'use strict';

/* exported MockWebManifestHelper */
var MockWebManifestHelper = {
  getManifest: function(manifestURL) {
    return Promise.resolve({'short_name': 'App', 'name': 'My App'});
  }
};
