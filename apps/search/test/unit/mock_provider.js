'use strict';

var MockProvider = function(name) {
  this.name = name;
};

MockProvider.prototype.init = function() {};
MockProvider.prototype.clear = function() {};
MockProvider.prototype.search = function() {};
MockProvider.prototype.abort = function() {};
