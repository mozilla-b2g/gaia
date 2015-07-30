(function(exports) {
  'use strict';

  var MockHome = function() {};

  MockHome.prototype = {
    edit: {
      on: function() {},
      off: function() {}
    },
    createCardNode: function() {}
  };

  exports.MockHome = MockHome;
}(window));
