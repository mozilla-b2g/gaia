var Responder = require(__dirname + '/../../test-agent/responder').TestAgent.Responder;

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

RunnerStreamProxy.Suite = function Suite(suite) {
  copy.call(this, suite);
  this._fullTitle = this.fullTitle;
  this.fullTitle = function(){
    return suite.fullTitle;
  }
};

RunnerStreamProxy.Test = function Test(test) {
  copy.call(this, test, ['fullTitle']);
  this.__test__ = test;
};

RunnerStreamProxy.Test.prototype.fullTitle = function fullTitle() {
  return this.__test__.fullTitle;
};

function RunnerStreamProxy(runner) {
  var self = this;

  Responder.apply(this, arguments);

  this.runner = runner;

  this.on({

    'start': function onStart(data) {
      runner.total = data.total;
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

module.exports = exports = RunnerStreamProxy;
