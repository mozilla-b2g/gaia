var debug = require('debug')('mozilla-get-url:locate'),
    optionHandler = require('./options');

var CHANNELS = ['tinderbox', 'release', 'prerelease', 'try'];

/**
Top level channel manager can detect which
channel should be used based on the given options.
*/
function locate(options, callback) {
  options = optionHandler(options);

  var channel = options.channel;

  if (CHANNELS.indexOf(channel) === -1) {
    throw new Error(
      'invalid channel: ' + channel + 'use one of: ' +
      CHANNELS.join(', ')
    );
  }

  require('./channels/' + channel)(options, callback);
}

module.exports = locate;
