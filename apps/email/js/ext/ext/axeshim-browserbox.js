/**
 * Customized shim for browserbox to use 'slog' with configurable logging level
 * that can be cranked up.
 */
define(function(require) {
  var logic = require('logic');
  var scope = logic.scope('BrowserBox');

  return {
    /**
     * Provide a .debug for things that are *only* logged when
     * sensitive logging is enabled. This exists right now mainly for
     * the benefit of the email.js libs. We're tying "debug" to
     * logSensitiveData both because we haven't audited the use of
     * debug and also because it is indeed a bit chatty.
     *
     * TODO: Address the logging detail level as a separate issue,
     * ideally while working with whiteout.io to fancify the email.js
     * logging slightly.
     */
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
