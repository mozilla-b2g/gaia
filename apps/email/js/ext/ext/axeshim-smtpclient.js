/**
 * Customized shim for browserbox to use 'slog' with configurable logging level
 * that can be cranked up.
 */
define(function() {
  var slog = require('slog');
  var slogTag = 'smtpclient';

  return {
    debug: function(ignoredTag, msg) {
      slog.debug(slogTag, { msg: msg });
    },
    log: function(ignoredTag, msg) {
      slog.log(slogTag, { msg: msg });
    },
    warn: function(ignoredTag, msg) {
      slog.warn(slogTag, { msg: msg });
    },
    error: function(ignoredTag, msg) {
      slog.error(slogTag, { msg: msg });
    }
  };
});
