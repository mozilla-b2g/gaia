'use strict';

(function(exports) {
  var MockInputFrameManager = function() {
    return this;
  };

  MockInputFrameManager.prototype = {
    runningLayouts: {},

    start: function mifm_start() {
    },

    stop: function mifm_stop() {
    },

    handleEvent: function mifm_handleEvent() {
    },

    setupFrame: function mifm_setupFrame() {
    },

    resetFrame: function mifm_resetFrame() {
    },

    launchFrame: function mifm_launchFrame() {
    },

    destroyFrame: function mifm_destroyFrame() {
    },

    deleteRunningKeyboardRef:
    function mifm_deleteRunningKeyboardRef(manifestURL) {
      delete this.runningLayouts[manifestURL];
    },

    deleteRunningFrameRef:
    function mifm_deleteRunningFrameRef(manifestURL, id) {
      delete this.runningLayouts[manifestURL][id];
    }

  };

  exports.MockInputFrameManager = MockInputFrameManager;
}(window));
