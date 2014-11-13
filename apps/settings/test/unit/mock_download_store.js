/*exported MockDownloadStore */

'use strict';

var MockDownloadStore = {
  error: false,
  downloads: [],
  getAll: function() {
    var request = {
      onsuccess: null
    };
    setTimeout(function() {
      var event = {
        target: {
          result: this.downloads
        }
      };
      request.onsuccess(event);

    }.bind(this), 1000);
    return request;
  },
  add: function() {
  },
  remove: function() {
  }
};
