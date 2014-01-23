var tmp = require('tmp');

// https://github.com/mozilla-b2g/mozilla-profile-builder/issues/2
process.on('SIGINT', function() {});

/**
 * Wrapper around common tmp dir creation functionality.
 *
 * Options:
 *  - (Boolean) keep: when true profile will not be removed on process close.
 *
 * @param {Object} options for tmp dir creation.
 * @param {Function} callback for tmp dir creation.
 */
function tmpdir(options, callback) {
  if (typeof options === 'function') {
    callback = options;
    options = null;
  }

  // configuration for temp directory
  // https://github.com/raszi/node-tmp#options
  var tmpConfig = {};
  if (options && options.keep) {
    // keep directory for later
    tmpConfig.keep = true;
  } else {
    // discard directory when process closes.
    tmpConfig.unsafeCleanup = true;
    tmpConfig.keep = false;
  }

  tmp.dir(tmpConfig, callback);
}

module.exports = tmpdir;
