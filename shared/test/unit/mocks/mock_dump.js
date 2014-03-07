'use strict';

var MockDump = (function() {
  var dump_off = function() {};
  var dump_on = function(msg, optionalObject) {
    var output = msg;
    if (optionalObject) {
      output += JSON.stringify(optionalObject);
    }
    console.log('[MockDUMP] ' + output);
  };

  return {
    enable: function() {
      return dump_on;
    },
    disable: function() {
      return dump_off;
    }
  };
}());

MockDump.disable();
