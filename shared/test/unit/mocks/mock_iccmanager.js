'use strict';

var MockIccManager = function() {
  this.iccIds = [];
};

MockIccManager.prototype.getIccById = function(id) {
  return {
    'iccInfo': {
      'iccid': id
    }
  };
};
