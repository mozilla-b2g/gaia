var Reporter = require(__dirname + '/../mocha/reporter');

/**
 * The usual merge function.
 * Takes multiple objects and merges
 * them in order into a new object.
 *
 * If I need this elsewhere should probably be a utility.
 *
 * @param {...Object} args any number of objects to merge.
 * @return {Object} result of merges.
 */
function merge() {
  var args = Array.prototype.slice.call(arguments),
      result = {};

  args.forEach(function(object) {
    var key;
    for (key in object) {
      if (object.hasOwnProperty(key)) {
        result[key] = object[key];
      }
    }
  });

  return result;
}

/**
 * REQUIRES: responder
 *
 * Provides a listener for test data events
 * to stream reports to the servers console.
 *
 * @constructor
 * @param {Object} options see mocha/reporter for options.
 */
function Mocha(options) {
  this.reporter = new Reporter(options);
  this.isRunning = false;
}

Mocha.prototype = {

  /**
   * Title for simulated syntax error test failures.
   *
   * @this
   * @type String
   */
  syntaxErrorTitle: 'Syntax Error',

  enhance: function enhance(server) {
    server.on('test data', this._onTestData.bind(this));
    server.on('error', this._onError.bind(this));
    this.reporter.on('start', this._onRunnerStart.bind(this, server));
    this.reporter.on('end', this._onRunnerEnd.bind(this, server));
  },

  _onError: function _onError(data) {
    if (this.isRunning) {
      this.emitSyntaxError(data);
    } else {
      this.savedError = data;
    }
  },

  _onTestData: function _onTestData(data, socket) {
    this.reporter.respond(data);
  },

  /**
   * Emits a fake test event for a syntax error.
   *
   * @this
   * @param {Object} error error object.
   * @param {String} error.message error message.
   * @param {String} error.filename file error occurred in.
   * @param {String} error.lineno line number of error.
   */
  emitSyntaxError: function emitError(error) {
    var baseEvent,
        errorMessage,
        errObject;

    baseEvent = {
      title: this.syntaxErrorTitle,
      fullTitle: this.syntaxErrorTitle
    };

    errorMessage = [
      error.message,
      'in file',
      error.filename + '#' + error.lineno
    ].join(' ');

    errObject = {
      message: errorMessage,
      stack: errorMessage,
      //best guess
      type: 'syntax error',
      //make mocha reporters happy
      expected: null,
      actual: null
    };

    this.reporter.respond(['suite', baseEvent]);
    this.reporter.respond(['test', baseEvent]);
    this.reporter.respond(['fail', merge(baseEvent, {
      err: errObject,
      state: 'failed'
    })]);
    this.reporter.respond(['test end', merge(baseEvent, {
      state: 'failed'
    })]);
    this.reporter.respond(['suite end', baseEvent]);
  },

  _onRunnerEnd: function _onRunnerEnd(server, runner) {
    var endArgs = Array.prototype.slice.call(arguments).slice(1);
    endArgs.unshift('test runner end');

    this.isRunning = false;
    this.savedError = undefined;
    server.emit.apply(server, endArgs);
  },

  _onRunnerStart: function _onRunnerStart(server, runner) {
    server.emit('test runner', runner);
    this.isRunning = true;
    if (this.savedError) {
      this.emitSyntaxError(this.savedError);
      this.savedError = undefined;
    }
  }

};

module.exports = exports = Mocha;
