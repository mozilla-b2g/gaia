/**
 * slog: Structured Logging (WIP/Exploratory). I (:mcav) don't care
 * about the name, I just wanted something short that I could
 * regex-replace later when we combine this with :asuth's similar
 * exploratory work.
 *
 * A precursor to the future described in <https://bugzil.la/976850>;
 * WIP and intended to be exploratory as we figure out how to actually
 * implement the full-on test refactoring.
 *
 * Behaves similarly to console.log and friends, with some
 * enhancements and conventions:
 *
 * - JSON objects passed in are stringified automatically.
 *
 * - Using the slog.log(errorName, errorDetails) format, you can
 *   integrate assertions into unit tests (more below).
 *
 * - Private keys (right now, those with an underscore, but welcome to
 *   change) are hidden from the JSON representation by default,
 *   unless super-secret debug mode is enabled.
 * 
 * Usage:
 *
 *   slog.log('imap:error', {
 *     user: 'foo',
 *     _pass: 'bar' // Private, due to the underscore.
 *   });
 *
 * The LogChecker for unit tests allows you to assert on logged
 * events. Presently it hooks in with a lazyLogger; in the future it
 * (and these structured logs) would be hooked directly into ArbPL:
 *
 *   var log = new LogChecker(T, RT);
 *   log.mustLog('imap:error', function(details) {
 *     return details.user === 'foo';
 *   });
 */
define('slog', function(require, exports, module) {
  var $log = require('rdcommon/log');
  var evt = require('evt');

  var logSensitiveData = false;
  exports.setSensitiveDataLoggingEnabled = function(enabled) {
    logSensitiveData = enabled;
    exports.log('meta:sensitive-logging', { enabled: enabled });
  };

  var logEmitter = new evt.Emitter();

  var LogChecker = exports.LogChecker = function(T, RT) {
    this.T = T;
    this.RT = RT;
    this.eLazy = T.lazyLogger('slog');
  };

  /**
   * Assert that a log with the given name, and optionally matching
   * the given predicate function, is logged during this test step.
   *
   * @param {String} name
   * @param {function(details) => boolean} [predicate]
   *   Optional predicate; called with the 'details' (second argument)
   *   of the slog.log() call. Return true if the log matched.
   */
  LogChecker.prototype.mustLog = function(name, /* optional */ predicate) {
    this.RT.reportActiveActorThisStep(this.eLazy);
    var successDesc = predicate && predicate.toString() || 'ok';
    this.eLazy.expect_namedValue(name, true);

    logEmitter.once(name, function(details) {
      try {
        var result = true;
        if (predicate) {
          result = predicate(details);
        }
        this.eLazy.namedValue(name, result);
      } catch(e) {
        console.error('Exception running LogChecker predicate:', e);
      }
    }.bind(this));
  };

  /**
   * Provides slog.log(), slog.info(), slog.warn(), and slog.error().
   * Call these methods with a conventional string as the first argument,
   * and JSONifiable details in the second argument.
   *
   * Mark sensitive details with an underscore-prefixed top-level key;
   * these fields will be stripped from the log output unless
   * sensitive debug logging is enabled.
   */
  ['log', 'info', 'warn', 'error'].forEach(function(name) {
    exports[name] = function(logName, details) {
      var orig = console[name].bind(console, '[slog]');

      logEmitter.emit(logName, details);

      orig.apply(console, Array.slice(arguments).map(function(arg) {

        if (typeof arg === 'object') {
          // Remove private properties
          var publicKeys = {};
          for (var key in arg) {
            if (logSensitiveData || key[0] !== '_') {
              publicKeys[key] = arg[key];
            }
          }
          try {
            return JSON.stringify(publicKeys);
          } catch(e) {
            return '[un-JSONifiable ' + arg + ']';
          }
        } else {
          return arg;
        }
      }));
    };
  });
});
