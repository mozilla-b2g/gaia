/* exported MockCostControl */
'use strict';

var MockCostControl = function(config) {

  config = config || {};

  var fakeCostControlInstance = config;

  return {
    getInstance: function(callback) {
      callback(fakeCostControlInstance);
    },
    reset: function() {
      fakeCostControlInstance = {};
    }
  };
};
