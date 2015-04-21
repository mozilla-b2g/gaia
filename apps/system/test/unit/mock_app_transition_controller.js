'use strict';

var MockAppTransitionController = function MockAppTransitionController(app) {
  if (app) {
    this.mApp = app;
  }
  return this;
};

MockAppTransitionController.prototype = {
  mApp: null,
  start: function() {},
  destroy: function() {},
  changeTransitionState: function() {},
  switchTransitionState: function() {},
  focusApp: function() {},
  requireOpen: function() {},
  requireClose: function() {},
  resetTransition: function() {},
  clearTransitionClasses: function() {}
};
