var child = require('child_process'),
    fs = require('fs');

function TestAgent(options) {
  var key;

  if (typeof(options) === 'undefined') {
    options = {};
  }

  for (key in options) {
    if (options.hasOwnProperty(key)) {
      this[key] = options[key];
    }
  }

}

TestAgent.prototype = {

  bin: __dirname + '/../node_modules/test-agent/bin/js-test-agent',

  exitStatus: 0,

  verbose: true,

  /**
   * Set configuration for test agent
   *
   * @type {String}
   */
  config: __dirname + '/../test-agent-server.js',

  /**
   * Port to start test agent on
   *
   * @type {Numeric}
   */
  port: 8789,

  execOutput: function(cmd, done) {
    var verbose = this.verbose;
    child.exec(cmd, function(err, out, stderr) {
      if (verbose) {
        if (err) {
          console.error(err);
        }
        if (stderr) {
          console.error(stderr);
        }
        if (out) {
          console.log(out);
        }

      }

      done(err, out, stderr);
    });
  },

  /**
   * Start test agent server.
   *
   * @this
   */
  start: function(cb) {
    var verbose = this.verbose;
    var args = [
      'server',
      '-c',
      this.config,
      '--port',
      this.port
    ];

    var agent = this.process = child.spawn(this.bin, args);

    agent.on('exit', function(err, data) {
      if (err > this.exitStatus) {
        this.exitStatus = err;
      }
    }.bind(this));
  },

  /**
   * Executes tests on test agent
   *
   * @this
   * @param {String} reporter Mocha reporter.
   * @param {Array} files lists.
   */
  test: function(reporter, files, saveLocation, done) {
    if (typeof(reporter) === 'function') {
      done = reporter;
      reporter = null;
    }

    if (typeof(files) === 'function') {
      done = files;
      files = null;
    }


    var cmd = [
      this.bin,
      'test',
      '--server',
      'ws://localhost:' + this.port
    ];

    if (reporter) {
      cmd.push('--reporter ' + reporter);
    }

    if (files) {
      cmd = cmd.concat(files);
    }

    this.execOutput(cmd.join(' '), function(err, out) {
      if (this.testOutputFile && out) {
        fs.writeFileSync(this.testOutputFile, out);
      }

      done.apply(this, arguments);
    }.bind(this));
  },

  /**
   * Stops test agent server
   * @this
   */
  stop: function() {
    this.process.kill();
  }

};

/** exports */
module.exports = exports = TestAgent;
