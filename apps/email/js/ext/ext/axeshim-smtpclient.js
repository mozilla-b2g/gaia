/**
 * Customized shim for browserbox to use 'slog' with configurable logging level
 * that can be cranked up.
 */
define(function(require) {
  var logic = require('logic');
  var scope = logic.scope('SmtpClient');

  return {
    // see axeshim-browserbox's comment about '.debug'
    debug: function(ignoredTag, msg) {
      if (!logic.isCensored) {
        logic(scope, 'debug', { msg: msg });
      }
    },
    log: function(ignoredTag, msg) {
      logic(scope, 'log', { msg: msg });
    },
    warn: function(ignoredTag, msg) {
      logic(scope, 'warn', { msg: msg });
    },
    error: function(ignoredTag, msg) {
      logic(scope, 'error', { msg: msg });
    }
  };
});
