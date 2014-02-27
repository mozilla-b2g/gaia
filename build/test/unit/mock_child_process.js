'use strict';

(function() {


  var MockChildProcess = function() {};
  MockChildProcess.prototype = {
    states: {
      command: '',
      options: {},
      environment: {},

      // callback registry
      stdout: {},
      stderr: {},
      on: {}
    },
    rc: null
  };
  
  MockChildProcess.prototype.spawn = function(cmd, opts, env) {
    this.states.command = cmd;
    this.states.options = opts;
    this.states.environment = env;
    return {
      'stdout': {'on': this.stdout.bind(this)},
      'stderr': {'on': this.stderr.bind(this)},
      'on': this.on.bind(this)
    };
  };

  MockChildProcess.prototype.on = function(ename, cb) {
    this.states.on[ename] = cb;
  };

  MockChildProcess.prototype.stdout = function(ename, cb) {
    this.states.stdout[ename] = cb;
  };

  MockChildProcess.prototype.stderr = function(ename, cb) {
    this.states.stderr[ename] = cb;
  };

  /**
   * Would generate a "remote controller" to let user feed in
   * stdout, stderr and close, exit and so on events.
   */
  MockChildProcess.prototype.rc = function() {
    var rcInstance = {
      stdout: {on:
        this.rcStdOutOn.bind(this)
      },
      stderr: {on:
        this.rcStdErrOn.bind(this)
      },
      on: this.rcOn.bind(this)
    };

    if(!this.rcInstance) {
      this.rcInstance = rcInstance;
    }
    return this.rcInstance;
  };

  MockChildProcess.prototype.rcStdOutOn = function(ename, content) {
    var cb = this.states.stdout[ename];
    if(cb) {
      return cb(content);
    }
  };

  MockChildProcess.prototype.rcStdErrOn = function(ename, content) {
    var cb = this.states.stderr[ename];
    if(cb) {
      return cb(content);
    }
  };

  MockChildProcess.prototype.rcOn = function(ename, content) {
    var cb = this.states.on[ename];
    if(cb) {
      return cb(content);
    }
  };

  exports.MockChildProcess = MockChildProcess;
})();
