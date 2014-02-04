define(function(require, exports, module) {
'use strict';

module.exports = allDone;

function allDone() {
  var counter = 0;
  var master = function() {};
  var decrement = function() {
    if (--counter === 0) {
      master();
    }
  };

  return function done(callback) {
    if (callback) {
      master = callback;
      return;
    }
    counter++;
    return decrement;
  };
}

});
