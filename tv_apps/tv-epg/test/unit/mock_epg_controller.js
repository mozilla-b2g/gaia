(function(exports) {
  'use strict';

  function MockEPGController() {
    this.on = function() {};
    this.fetchPrograms = function() {
      return {
        then: function(callback) {
          callback();
        }
      };
    };
  }

  exports.MockEPGController = MockEPGController;
}(window));
