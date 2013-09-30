'use strict';

var MockmozContact = function() {};

MockmozContact.prototype.init = function(obj) {
  var self = this;
  Object.keys(obj).forEach(function(k) {
    self[k] = obj[k];
  });
};
