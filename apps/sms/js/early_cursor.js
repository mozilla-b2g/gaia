'use strict';

(function(exports) {

var cursor = navigator.mozMobileMessage.getThreads();
var results = [];

cursor.onsuccess = function() {
  if (this.result) {
    results.push(this.result);
    cursor.continue();
  } else {
    results.push(null);
  }
};

function clean() {
  cursor = null;
  results = null;
}

exports.EarlyCursor = {
  cursor: cursor,
  results: results,
  clean: clean
};

})(window);
