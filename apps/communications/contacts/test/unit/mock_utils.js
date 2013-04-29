'use strict';

var MockURL = {
  createObjectURL: function(url) {
    return url;
  }
};

var MockImageLoader = function() {
  this.init = function() {};
  this.reload = function() {};
  this.setResolver = function() {};
};
