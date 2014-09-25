/* exported WebManifestHelper */
'use strict';

/**
 *  Helper to fetch and process a Web Manifest.
 */
(function WebManifestHelper(exports) {
  
  var getJSON = function(url) {
    return new Promise(function(resolve, reject) {
      var xhr = new XMLHttpRequest({mozSystem: true});
      xhr.open('get', url, true);
      xhr.responseType = 'json';
      xhr.onload = function() {
        var status = xhr.status;
        if (status == 200) {
          resolve(xhr.response);
        } else {
          reject(status);
        }
      };
      xhr.onerror = function(e) {
        console.error('Unable to get web manifest');
      };
      xhr.send();
    });
  };
  
  var getManifest = function(url) {
    getJSON(url).then(function(data) {
      console.log('MSG ' + JSON.stringify(data));
    }, function(status) {
      console.error('Unable to get web manifest: ' + status);
    });
  };

  exports.WebManifestHelper = {
    getManifest: getManifest
  };

})(window);