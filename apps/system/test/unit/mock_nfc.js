'use strict';
(function(exports) {

  var MockNfc = {
    startPoll: function() { return {}; },
    stopPoll: function() { return {}; },
    powerOff: function() { return {}; }
  };

  exports.MockNfc = MockNfc;
})(window);
