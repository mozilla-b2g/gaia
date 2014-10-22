console.time("mock_download_helper.js");
'use strict';
/* exported MockDownloadHelper */

var MockDownloadHelper = {
  open: function() {
    return {
      set onsuccess(s) { setTimeout(function() {
       s();
      }, 100); },
      set onerror(e) {}
    };
  },
  remove: function() {
    return {
      set onsuccess(s) { setTimeout(function() {
       s();
      }, 100); },
      set onerror(e) {}
    };
  },
  handlerError: function(error, download, cb) {

  },
  showRemoveFileUI: function(download, cb) {

  }
};
console.timeEnd("mock_download_helper.js");
