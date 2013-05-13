(function() {
  var isNode = typeof(window) === 'undefined',
      Responder,
      exports;

  if(!isNode) {
    if(typeof(TestAgent.Mocha) === 'undefined') {
      TestAgent.Mocha = {};
    }
    Responder = TestAgent.Responder;
  } else {
    Responder = require('../responder');
  }

  function copy(values, exclude) {
    var key;

    if (!exclude) {
      exclude = [];
    }

    for (key in values) {
      if (values.hasOwnProperty(key)) {
        if (exclude.indexOf(key) > -1) {
          continue;
        }
        this[key] = values[key];
      }
    }
  }

  function wrapWithEnvId(data) {
    var prefix;
    if (data.testAgentEnvId) {
      prefix = '[' + data.testAgentEnvId + '] ';
      if (data.__test__.fullTitle !== '') {
        data.__test__.fullTitle = prefix + data.__test__.fullTitle;
      }

      if (data.title !== '') {
        data.title = prefix + data.title;
      }
    }
  }

  RunnerStreamProxy.Suite = function Suite(suite) {
    this.__test__ = suite;
    copy.call(this, suite, ['fullTitle']);
    wrapWithEnvId(this);
  };

  RunnerStreamProxy.Suite.prototype.fullTitle = function() {
    return this.__test__.fullTitle;
  };


  RunnerStreamProxy.Test = function Test(test) {
    this.__test__ = test;
    copy.call(this, test, ['fullTitle', 'slow']);
    wrapWithEnvId(this);
  };

  RunnerStreamProxy.Test.prototype = {
    fullTitle: function() {
      return this.__test__.fullTitle;
    },

    slow: function() {
      return this.__test__.slow;
    }
  };

  function RunnerStreamProxy(runner) {
    var self = this;

    Responder.apply(this, arguments);

    this.runner = runner;

    this.on({

      'start': function onStart(data) {
        runner.emit('start', data);
      },

      'log': function onLog(data) {
        console.log.apply(console, data.messages);
      },

      'end': function onEnd(data) {
        runner.emit('end', data);
      },

      'suite': function onSuite(data) {
        this.parent = new RunnerStreamProxy.Suite(data);
        runner.emit('suite', this.parent);
      },

      'suite end': function onSuiteEnd(data) {
        runner.emit('suite end', new RunnerStreamProxy.Suite(data));
        this.parent = null;
      },

      'test': function onTest(data) {
        self.err = null;
        runner.emit('test', this._createTest(data));
      },

      'test end': this._emitTest.bind(this, 'test end'),
      'fail': this._emitTest.bind(this, 'fail'),
      'pass': this._emitTest.bind(this, 'pass'),
      'pending': this._emitTest.bind(this, 'pending')

    });
  }

  RunnerStreamProxy.prototype = Object.create(Responder.prototype);

  /**
   * Emits a event on the runner intended to be used with bind
   *
   *    something.on('someEventName', this._emitTest.bind('someEventName'));
   *
   * @param {String} event
   * @param {Object} data
   */
  RunnerStreamProxy.prototype._emitTest = function _emitTest(event, data) {
    var err;
    if (data.err) {
      err = data.err;
      this.err = err;
    }
    this.runner.emit(event, this._createTest(data), err);
  };

  /**
   * Factory to create a test.
   *
   *
   * @param {Object} data
   * @return {RunnerStreamProxy.Test}
   */
  RunnerStreamProxy.prototype._createTest = function _createTest(data) {
    var test = new RunnerStreamProxy.Test(data);

    test.parent = this.parent;

    if (this.err) {
      test.err = this.err;
    }

    return test;
  };


  if (isNode) {
    module.exports = RunnerStreamProxy;
  } else {
    TestAgent.Mocha.RunnerStreamProxy = RunnerStreamProxy;
  }

}());
