'use strict';
/* exported MockImageLoader */
/* exported MockURL */
/* exported MockUtils */

var MockURL = {
  createObjectURL: function(url) {
    return url;
  },

  revokeObjectURL: function(url) {
    // do nothing
  }
};


var MockImageLoader = function() {
  this.init = function() {};
  this.reload = function() {};
  this.setResolver = function() {};
  this.releaseImage = function() {};
};

var MockUtils = {
  'misc' : {
    'toMozContact': function(c) {
      return c;
    }
  }
};
