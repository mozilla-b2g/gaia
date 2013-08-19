(function(window) {
  'use strict';

  if (typeof(window.TestAgent) === 'undefined') {
    window.TestAgent = {};
  }

  TestAgent.BrowserWorker = function BrowserWorker(options) {
    var self = this,
        dep = this.deps;

    if (typeof(options) === 'undefined') {
      options = {};
    }

    function option(name) {
      if (name in options) {
        return options[name];
      }

      if (name in self.defaults) {
        return self.defaults[name];
      }

      return undefined;
    }


    this.deps.Server.call(this, option('server'));
    this.sandbox = new dep.Sandbox(option('sandbox'));
    this.loader = new dep.Loader(option('loader'));

    this._testsProcessor = [];
    this.testRunner = options.testRunner;
    //event proxy
    this.sandbox.on('error', this.emit.bind(this, 'sandbox error'));
  };

  //inheritance
  TestAgent.BrowserWorker.prototype = Object.create(
      TestAgent.WebsocketClient.prototype
  );

  var proto = TestAgent.BrowserWorker.prototype;

  proto.deps = {
    Server: TestAgent.WebsocketClient,
    Sandbox: TestAgent.Sandbox,
    Loader: TestAgent.Loader,
    ConfigLoader: TestAgent.Config
  };

  proto.defaults = {
    server: {
      retry: true,
      url: 'ws://' + document.location.host.split(':')[0] + ':8789'
    }
  };

  /**
   * Create a new sandbox instance and set
   * loader to use it as its target.
   *
   * @param {Function} callback executed when sandbox is created.
   */
  proto.createSandbox = function createSandbox(callback) {
    var self = this;

    this.sandbox.run(function onSandboxRun() {
      self.loader.targetWindow = this;
      if (callback) {
        if (!('require' in this)) {
          this.require = self.loader.require.bind(self.loader);
        }
        callback.call(this, self.loader);
        self.emit('sandbox', this, self.loader);
      }
    });
  };

  proto._emitTestComplete = function _emitTestComplete() {
    var args = Array.prototype.slice.call(arguments);
    args.unshift('run tests complete');
    this.emit.apply(this, args);
  };

  /**
   * Adds function which will reduce the test files given to runTests.
   * Each filter much return an array of tests.
   *
   *    worker.addTestsProcessor(function(tests){
   *      return tests;
   *    });
   *
   * @param {Function} callback reducer function.
   * @return {Object} self.
   */
  proto.addTestsProcessor = function addTestsProcessor(callback) {
    this._testsProcessor.push(callback);
  };


  /**
   * Runs tests through all testsProcessor reducers.
   *
   *
   * @param {Array} tests list of tests to process.
   */
  proto._processTests = function _processTests(tests) {
    var result = tests,
        reducers = this._testsProcessor,
        length = reducers.length,
        i = 0;

    for (; i < length; i++) {
      result = reducers[i](result);
    }

    return result;
  };

  /**
   * Builds sandbox executes the .testRunner function.
   *
   * @param {Array} tests list of tests to execute.
   */
  proto.runTests = function runTests(tests) {
    var self = this,
        done = this._emitTestComplete.bind(this);

    if (!this.testRunner) {
      throw new Error('Worker must be provided a .testRunner method');
    }

    this.createSandbox(function createSandbox() {
      self.testRunner(self, self._processTests(tests), done);
    });
  };

  /**
   * Enhances worker with functionality from class.
   *
   *    Enhancement = function(options){}
   *    Enhancement.prototype.enhance = function enhance(server){
   *      //do stuff
   *    }
   *
   *    //second argument passed to constructor
   *    worker.enhance(Enhancement, {isBlue: true});
   *
   *
   * @param {Object} enhancement enhancement class.
   * @param {Object} options options for class.
   * @return {Object} self.
   */
  proto.use = function use(enhancement, options) {
    new enhancement(options).enhance(this);

    return this;
  };

}(this));
