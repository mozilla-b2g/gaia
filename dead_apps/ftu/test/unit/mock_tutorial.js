/* exported MockTutorial */
'use strict';

var MockTutorial = {
  currentStep: 0,
  imagesLoaded: [],
  init: function() {},
  jumpTo: function() {},
  jumpToExitStep: function() {},
  manageStep: function() {},
  loadConfig: function() {
    return {
      then: function(cb) {
        cb();
      }
    };
  }
};
