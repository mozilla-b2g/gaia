'use strict';


var MockMozContact = (function() {});

MockMozContact.prototype.init = function(obj) {
  var self = this;
  Object.keys(obj).forEach(function(k) {
    self[k] = obj[k];
  });
};

MockMozContact.prototype.save = function() {};
