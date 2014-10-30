var EventEmitter = require('events').EventEmitter,
    debug = require('debug')('worker'),
    spawn = require('child_process').spawn;


function Worker(opts) {
  EventEmitter.call(this);

  for (var key in opts) {
    this[key] = opts[key];
  }
}
module.exports = Worker;


Worker.prototype = {
  __proto__: EventEmitter.prototype,

  /**
   * @type {String}
   */
  cwd: null,

  /**
   * @type {Object}
   */
  env: null,

  /**
   * @type {Array}
   */
  queue: null,

  /**
   * @type {Boolean}
   */
  isBusy: false,

  work: function() {
    // No work left... sad!
    if (!this.queue || this.queue.length === 0) {
      this.isBusy = false;
      return this.emit('complete');
    }

    this.isBusy = true;
    var next = this.queue.pop().split(' ');
    var command = next[0];
    var args = next.slice(1).filter(function(arg) {
      return !/^\s*$/.test(arg);
    });

    // Execute test case.
    var opts = {};
    if (this.cwd) {
      opts.cwd = this.cwd;
    }
    if (this.env) {
      opts.env = this.env;
    }

    debug(
      'command: %s %s in %s',
      command,
      args.join(' '),
      this.cwd
    );
    var mocha = spawn(command, args, opts);

    var stdout = '';
    mocha.stdout.on('data', function(data) {
      stdout += data;
    });

    var stderr = '';
    mocha.stderr.on('data', function(data) {
      if (/\d+ failing/.test(data)) {
        stdout += data;
      } else if (/\d+\)\s+/.test(data)) {
        // Collect the error traces in stderr.
        stderr += data;
      } else {
        // Swallow other warnings to stderr for now.
      }
    });

    mocha.on('error', function(error) {
      console.error('error: ' + error);
    });

    mocha.on('exit', function() {
      var results = { passing: 0, pending: 0, failing: 0, failures: [] };

      // Parse mocha epilogue.
      [
        'passing',
        'pending',
        'failing'
      ].forEach(function(resultType) {
        var regex = new RegExp('(\\d+) ' + resultType);
        var match = regex.exec(stdout);
        var count = match === null ? 0 : parseInt(match[1]);
        results[resultType] = count;
        debug('command - %d %s', count, resultType);
      });

      // Epilogue test failures get written to stderr.
      if (!/^\s+$/.test(stderr)) {
        results.failures.push(stderr);
      }

      this.emit('results', results);
      this.work();
    }.bind(this));
  }
};
