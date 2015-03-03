/* exported WebManifestHelper */
'use strict';

/**
 *  Helper to fetch and process a Web Manifest.
 */
(function WebManifestHelper(exports) {

  /**
   * It specifies whether the phone is in online or offline mode.
   *
   * @returns {Promise} A promise that will be fulfilled when online.
   */
  var onConnected = function() {
    if (navigator.onLine) {
      return Promise.resolve();
    }

    return new Promise(function(resolve, reject) {
       window.addEventListener('online', function onConnect() {
        window.removeEventListener('online', onConnect);
        resolve();
      });
    });
  };

  /**
   * Get Manifest.
   *
   * @param {String} url Manifest URL
   * @returns {Promise} A promise of a response containing manifest data.
   */
  var getManifest = function(url) {
    return new Promise(function(resolve, reject) {
      onConnected().then(() => {
        var xhr = new XMLHttpRequest({mozSystem: true});
        xhr.open('get', url, true);
        xhr.responseType = 'json';
        xhr.setRequestHeader('Accept', 'application/manifest+json');
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
          reject(e.target.status);
        };
        xhr.send();
      });
    });
  };

  exports.WebManifestHelper = {
    getManifest: getManifest
  };

})(window);
