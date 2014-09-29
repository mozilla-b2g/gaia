define(function(require, exports, module) {
'use strict';

/** Deprecated! */
module.exports = function(name, callback) {
  suite(name, function() {
    suiteSetup(function(done) {
      require([name], function() {
        done();
      });
    });

    callback();
  });
};

});
