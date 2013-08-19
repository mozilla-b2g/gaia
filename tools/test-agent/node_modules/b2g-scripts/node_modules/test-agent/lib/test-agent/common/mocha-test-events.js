(function() {

  var isNode = typeof(window) === 'undefined',
      Reporter;

  if (isNode) {
    Reporter = require('../mocha/reporter');
  } else {
    if (typeof(TestAgent.Common) === 'undefined') {
      TestAgent.Common = {};
    }
    Reporter = TestAgent.Mocha.Reporter;
  }

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
    if (typeof(options) === 'undefined') {
      options = {};
    }

    if(options.mochaSelector) {
      this.mochaSelector = options.mochaSelector;
      delete options.mochaSelector;
    }

    this.reporter = new Reporter(options);
    this.isRunning = false;
  }

  Mocha.prototype = {

    /**
     * Used to clear previous mocha element
     * for HTML reporting.
     * Obviously only used when window is present.
     *
     * @type String
     */
    mochaSelector: '#mocha',

    /**
     * Title for simulated syntax error test failures.
     *
     * @this
     * @type String
     */
    syntaxErrorTitle: 'Syntax Error',

    enhance: function enhance(server) {
      server.on('test data', this._onTestData.bind(this));
      server.on('set test envs', this._onSetTestEnvs.bind(this));
      this.reporter.on('start', this._onRunnerStart.bind(this, server));
      this.reporter.on('end', this._onRunnerEnd.bind(this, server));
    },

    _onSetTestEnvs: function _onSetTestEnvs(env) {
      this.reporter.setEnvs(env);
    },

    _onTestData: function _onTestData(data, socket) {
      this.reporter.respond(data);
    },

    _onRunnerEnd: function _onRunnerEnd(server, runner) {
      var endArgs = Array.prototype.slice.call(arguments).slice(1);
      endArgs.unshift('test runner end');

      this.isRunning = false;
      server.emit.apply(server, endArgs);
    },

    _onRunnerStart: function _onRunnerStart(server, runner) {

      if (typeof(window) !== 'undefined') {
        this._startBrowser();
      }

      server.emit('test runner', runner);

      this.isRunning = true;
    },

    _startBrowser: function() {
      var el = document.querySelector(this.mochaSelector);
      if (el) {
        el.innerHTML = '';
      }
    }
  };

  if (isNode) {
    module.exports = Mocha;
  } else {
    TestAgent.Common.MochaTestEvents = Mocha;
  }

}());
