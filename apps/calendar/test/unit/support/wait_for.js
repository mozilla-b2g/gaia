define(function(require, exports, module) {
'use strict';

var denodeify = require('common/promise').denodeify;

function waitFor(test, callback) {
  var result = test();
  if (result) {
    return callback();
  }

  setTimeout(() => waitFor(test, callback), 200);
}

module.exports = denodeify(waitFor);

});
