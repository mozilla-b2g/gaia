'use strict';

var mockMozActivityInstance = null;

var MockMozActivity = function MozActivity(configuration) {
  for (var property in configuration) {
    this[property] = configuration[property];
  }
  mockMozActivityInstance = this;
  return this;
};

