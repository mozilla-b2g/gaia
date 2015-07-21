/* globals evt */

(function(exports) {
  'use strict';

  var MockEdit = function() {
  };

  MockEdit.prototype = evt({
    init: function() {},
    onMove: function() { return false; },
    onEnter: function() {return false; }
  });

  exports.MockEdit = MockEdit;
})(window);
