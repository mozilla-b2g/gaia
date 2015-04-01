/* globals evt */

(function(exports) {
  'use strict';

  var MockAnimations = evt({
    init: function() {},
    doBubbleAnimation: function(parentElem, childClass, length, cb) {
      cb();
    }
  });
  exports.MockAnimations = MockAnimations;
})(window);
