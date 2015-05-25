(function(exports) {
  'use strict';

  function MockEPGController() {
    this.on = function() {};
    this.fetchPrograms = function() {
      var promise = {
        then: function(callback) {
          callback();
          return promise;
        },
        catch: function() {
          return promise;
        }
      };
      return promise;
    };
  }

  exports.MockEPGController = MockEPGController;
}(window));
