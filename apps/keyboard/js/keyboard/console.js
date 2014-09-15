'use strict';

/* global console, performance */

/**
 * KeyboardConsole is an incomplete implementation of console so we could
 * turn it on and off on build time.
 */

(function(exports) {
var KeyboardConsole = function KeyboardConsole() {
  this._timers = null;
};

KeyboardConsole.prototype.start = function() {
  var timers = this._timers = new Map();
  timers.set('domLoading', performance.timing.domLoading);

  this._startTime = Date.now();
};

/**
 *
 * Log level decides whether or not to print log.
 *
 * 0 - warn() and error()
 * 1 - info()
 * 2 - log() and time() and timeEnd()
 * 3 - trace()
 *
 * Note that we want console.warn() and console.error() show up in
 * production too so warn() and error() is not implemented here.
 *
 */
KeyboardConsole.prototype.LOG_LEVEL = 0;

KeyboardConsole.prototype.trace = function() {
  if (this.LOG_LEVEL < 3) {
    return;
  }

  console.trace.apply(console, arguments);
};

KeyboardConsole.prototype.time = function(timerName) {
  if (this.LOG_LEVEL < 2) {
    return;
  }

  console.time(timerName);
};

KeyboardConsole.prototype.timeEnd = function(timerName) {
  if (this.LOG_LEVEL < 2) {
    return;
  }

  if (this._timers.has(timerName)) {
    console.log(timerName + ': ' +
      (Date.now() - this._timers.get(timerName)) + 'ms');

    return;
  }

  console.timeEnd(timerName);
};

KeyboardConsole.prototype.log = function() {
  if (this.LOG_LEVEL < 2) {
    return;
  }

  console.log.apply(console, arguments);
};

KeyboardConsole.prototype.info = function() {
  if (this.LOG_LEVEL < 1) {
    return;
  }

  console.info.apply(console, arguments);
};

exports.KeyboardConsole = KeyboardConsole;

})(window);
