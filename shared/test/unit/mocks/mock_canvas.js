'use strict';

(function(exports) {
  var MockCanvas = function() {
    this.width = null;
    this.height = null;
    return this;
  };

  MockCanvas.prototype = {
    getContext: function mc_getContext() {
    }
  };

  exports.MockCanvas = MockCanvas;
})(window);
