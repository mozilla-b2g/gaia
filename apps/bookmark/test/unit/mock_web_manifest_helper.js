'use strict';

/* exported MockWebManifestHelper */
var MockWebManifestHelper = {
  getManifest: function(manifestURL) {
    return new Promise(function(resolve, reject) {
      resolve({'short_name': 'App', 'name': 'My App'});
    });
  }
};