'use strict';

(function(exports) {

/**
 * InputMethodDatabaseLoader provide a uniform interface for the IMEngine to
 * get it's data (as arraybuffer). It currently supports getting the data from
 * package only but eventually we would like to get the dynamic downloaded data
 * from IndexedDB as well.
 */
var InputMethodDatabaseLoader = function InputMethodDatabaseLoader() {
};

InputMethodDatabaseLoader.prototype.SOURCE_DIR = './js/imes/';

InputMethodDatabaseLoader.prototype.start = function() {
  // Noop
};

InputMethodDatabaseLoader.prototype.stop = function() {
  // Noop
};

InputMethodDatabaseLoader.prototype.load = function(imEngineName, dataPath) {
  return new Promise(function(resolve, reject) {
    var url = this.SOURCE_DIR + imEngineName + '/' + dataPath;
    var xhr = new XMLHttpRequest();
    xhr.open('GET', url, true);
    xhr.responseType = 'arraybuffer';

    xhr.onload = function() {
      if (xhr.status !== 404 &&
          xhr.response &&
          xhr.response.byteLength) {
        resolve(xhr.response);
      } else {
        reject(xhr.statusText);
      }
    };

    xhr.send();
  }.bind(this)).catch(function(e) {
    console.error('InputMethodDatabaseLoader: XHR failed to load data.',
      'imEngineName=', imEngineName,
      'dataPath=', dataPath,
      'error=', e);

    throw e;
  });
};

exports.InputMethodDatabaseLoader = InputMethodDatabaseLoader;

})(window);
