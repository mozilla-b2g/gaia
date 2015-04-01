/* globals evt */

(function(exports) {
  'use strict';

  var MockSearchBar = function() {
  };

  MockSearchBar.prototype = evt({
    init: function() {}
  });

  exports.MockSearchBar = MockSearchBar;
})(window);
