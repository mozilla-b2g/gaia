'use strict';
var LogGrabber = require('./lib/log_grabber').LogGrabber;

/**
 * How many log entries should be buffered in the device for our retrieval?  The
 * obvious trade-off here is between memory and losing log entries.  And the
 * underlying variables are rate of log generation and how often we poll for new
 * logs.
 */
var DEFAULT_LOG_LIMIT = 10000;

function setup(client, options) {
  if (!options) {
    options = {};
  }

  var grabber = new LogGrabber(client, options.logLimit || DEFAULT_LOG_LIMIT);

  // Note!  marionette-js-runner's createHost method uses resetWithDriver every
  // time it goes to instantiate us.  As a byproduct of this call, all hooks are
  // reset, and this is why we don't need to worry about these addHook calls
  // redundantly stacking up.
  client.addHook('startSession', function(done) {
    grabber._connect(done);
  });

  // deleteSession's hook runs after the session is already torn down, so we
  // can't actually do anything at this point.

  return grabber;
}

exports.setup = setup;
