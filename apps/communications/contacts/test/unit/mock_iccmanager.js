'use strict';

var MockIccManager = function() {
  this.iccIds = [];
};

MockIccManager.prototype.getIccById = function(id) {
  return {
    'iccId': id,
    'iccInfo': {}
  };
};
