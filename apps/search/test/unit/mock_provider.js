'use strict';
/* global Promise */

var MockProvider = function(name) {
  this.name = name;
};

MockProvider.prototype.init = function() {};
MockProvider.prototype.clear = function() {};
MockProvider.prototype.search = function() {
  return new Promise(() => {});
};
MockProvider.prototype.abort = function() {};
