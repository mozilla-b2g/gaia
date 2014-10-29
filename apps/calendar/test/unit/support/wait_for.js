define(function(require, exports, module) {
'use strict';

module.exports = function waitFor(test, callback) {
  var result = test();
  if (result) {
    return callback();
  }

  setTimeout(() => {
    waitFor(test, callback);
  }, 500);
};

});
