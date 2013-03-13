'use strict';

var MockHomeState = {
  init: function(eachPageCallback, onSuccessCallback, onErrorCallback) {
    // first page is the dock, let's say it's empty
    eachPageCallback({ index: 0, icons: [] });
    onSuccessCallback();
  },
  saveGrid: function() {
  }
};
