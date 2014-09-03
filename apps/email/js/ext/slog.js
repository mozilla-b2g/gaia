/**
 * slog: Structured Logging (WIP/Exploratory)
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
 * The LogChecker for unit tests allows you to assert on logged events or that
 * events should not be logged.  Things are a little hacky right now.
 *
 * Current each LogChecker uses one lazyLogger to track the things that must be
 * logged and one lazyLogger to track the things that must not be logged.
 *
 * The "must" subscribes to logs with that name type until all of its "musts"
 * have been resolved, then it unsubscribes.  There is currently no way to
 * express that after those things are logged that we should never see any
 * more logs of that type.  (But based on the lazyLogger semantics if we
 * didn't remove our event listener, it would do what we want.)
 *
 * The "must not" creates a lazy logger that is supposed to expect nothing
 * to be logged and subscribes to that log type, logging it if it sees it.
 *
 * Sequence-wise, each LogChecker expects everything it is told to happen
 * sequentially.  If you don't want this requirement enforced, then use
 * separate LogChecker instances, one for each sequential thread of execution
 * you want.
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

  exports.resetEmitter = function() {
    logEmitter = new evt.Emitter();
  };

  var LogChecker = exports.LogChecker = function(T, RT, name) {
    this.T = T;
    this.RT = RT;
    this.eLazy = this.T.lazyLogger(name);
    this.eNotLogLazy = null;
    this._subscribedTo = {};
  };

  /**
   * Assert that a log with the given name, and optionally matching
   * the given predicate function, is logged during this test step.
   *
   * @param {String} name
   * @param {function(details) => boolean} [predicate]
   *   Optional predicate; called with the 'details' (second argument)
   *   of the slog.log() call. Return true if the log matched.  Alternately,
   *   if this is an object, we will use the loggest nested equivalence
   *   checking logic.
   */
  LogChecker.prototype.mustLog = function(name, /* optional */ predicate) {
    var eLazy = this.eLazy;

    var queued = this._subscribedTo[name];
    if (queued === undefined) {
      queued = this._subscribedTo[name] = [];
      logEmitter.on(name, function(details) {
        var predicate = queued.shift();
        try {
          if (predicate === null) {
            eLazy.namedValue(name, details);
          } else {
            var result = true;
            if (predicate) {
              result = predicate(details);
            }
            eLazy.namedValueD(name, result, details);
          }
        } catch(e) {
          console.error('Exception running LogChecker predicate:', e);
        }
        // When we run out of things that must be logged, stop listening.
        if (queued.length === 0) {
          logEmitter.removeListener(name);
        }
      });
    }

    this.RT.reportActiveActorThisStep(eLazy);
    if (typeof(predicate) === 'object') {
      // If it's an object, just expect that as the payload
      eLazy.expect_namedValue(name, predicate);
      queued.push(null);
    } else {
      // But for a predicate (or omitted predicate), expect it to return
      // true.  But also pass the value through as a detail
      eLazy.expect_namedValueD(name, true);
      queued.push(predicate);
    }
  };

  /**
   * Assert that a log with the given name, and optionally matching
   * the given predicate function, is NOT logged during this test
   * step. This is the inverse of `mustLog`.
   *
   * @param {String} name
   * @param {function(details) => boolean} [predicate]
   *   Optional predicate; called with the 'details' (second argument)
   *   of the slog.log() call. Return true if the log matched.
   */
  LogChecker.prototype.mustNotLog = function(name, /* optional */ predicate) {
    var notLogLazy = this.eNotLogLazy;
    if (!notLogLazy) {
      notLogLazy = this.eNotLogLazy = this.T.lazyLogger('slog');
    }
    this.RT.reportActiveActorThisStep(notLogLazy);
    notLogLazy.expectNothing();

    logEmitter.once(name, function(details) {
      try {
        var result = true;
        if (predicate) {
          result = predicate(details);
        }
        notLogLazy.namedValue(name, JSON.stringify(details));
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
