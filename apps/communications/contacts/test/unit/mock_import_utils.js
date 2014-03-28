/* exported MockimportUtils */
'use strict';

var MockimportUtils = {
  getPreferredPictureBox: function(){
    return 1;
  },
  getPreferredPictureDetail: function() {
    return 1;
  },
  setTimestamp: function(type, callback) {
    callback(Date.now());
  },
  getTimestamp: function(type, callback) {
    callback(Date.now());
  }
};

