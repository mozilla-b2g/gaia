/*exported MockDownloadStore */

'use strict';

var MockDownloadStore = {
  error: false,
  downloads: [],
  listeners: [],
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

    }.bind(this), 0);
    return request;
  },
  add: function() {
  },
  remove: function() {
  },
  addListener: function(listener) {
    var request = {
      onsuccess: null
    };

    if (this.listeners.indexOf(listener) == -1) {
      this.listeners.push(listener);
    }
    setTimeout(function() {
      var event = { target: { result: {} }};
      request.onsuccess(event);
    }.bind(this), 0);

    return request;
  },
  removeListener: function(listener) {
    var index = this.listeners.indexOf(listener);
    if (index > -1) {
      this.listeners.splice(index, 1);
    }
  }
};
