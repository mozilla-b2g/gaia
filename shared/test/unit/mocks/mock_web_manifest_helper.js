'use strict';

/* exported MockWebManifestHelper */
var MockWebManifestHelper = {
  processRawManifest: function() {},
  getManifest: function(manifestURL) {
    return Promise.resolve({'short_name': 'App', 'name': 'My App'});
  }
};
