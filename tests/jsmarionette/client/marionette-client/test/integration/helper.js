'use strict';
module.exports.skipInitialError = function (client) {
  setup(function(done) {
    client.executeAsyncScript(function() {
      setTimeout(marionetteScriptFinished, 10);
    }, function(err) {
      // hacked work around for gaia exception at startup.
      if (
        err &&
        err.message &&
        err.message.indexOf('Expected IccHelper') !== -1
      ) {
        return done();
      }
      done(err);
    });
  });
};
