'use strict';

var MockDownloadHelper = {
  launch: function() {
    return {
      set onsuccess(s) { setTimeout(function() {
       s();
      }, 100)},
      set onerror(e) {}
    };
  },
  remove: function() {
    return {
      set onsuccess(s) { setTimeout(function() {
       s();
      }, 100)},
      set onerror(e) {}
    };
  },
  handlerError: function(error, download, cb) {

  },
  showRemoveFileUI: function(download, cb) {

  }
};
