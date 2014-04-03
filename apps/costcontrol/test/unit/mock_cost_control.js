/* exported MockCostControl */
'use strict';

var MockCostControl = function(config) {

  config = config || {};

  var fakeCostControlInstance = {};

  return {
    getInstance: function(callback) {
      callback(fakeCostControlInstance);
    }
  };
};
