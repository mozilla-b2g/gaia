'use strict';

(function(exports) {
  var MockEmergencyCallbackManager = {
    active: false,
    mSetup: function() {
      this.active = false;
    }
  };
  exports.MockEmergencyCallbackManager = MockEmergencyCallbackManager;
}(window));
