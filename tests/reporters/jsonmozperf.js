/**
 * Initialize a new `JSON` reporter for MozTest.
 *
 * @param {Runner} runner is the mocha runner that will run the test
 * @api public
 */

'use strict';

(function(global) {

function JSONMozPerfReporter(runner) {
  global.Mocha.reporters.Base.call(this, runner);

  // "mocha" is the Mocha instance
  // by default mocha report if any test leaks a variable in the global scope.
  // We don't need this here because we're really running tests on the device,
  // so this ignores leaks in our tests, and make it easier to use a global
  // variable to save our test resuls.
  global.mocha.options.ignoreLeaks = true;

  var failures = [];
  var passes = [];

  runner.on('test', function(test) {
    global.mozPerfDurations = null;
  });

  runner.on('pass', function(test) {
    if (global.mozPerfDurations === null) {
      test.err = new Error('No perf data was reported');
      failures.push(test);
      return;
    }

    for (var title in global.mozPerfDurations) {
      // we can have several measurements for one test, that's why we're
      // rewriting the title (each measurement has a title)
      passes.push({
        title: test.title + ' ' + title,
        fullTitle: test.fullTitle() + ' ' + title,
        duration: test.duration,
        mozPerfDurations: global.mozPerfDurations[title],
        mozPerfDurationsAverage: average(global.mozPerfDurations[title])
      });
    }
  });

  runner.on('fail', function(test, err) {
    failures.push(test);
  });

  var self = this;
  runner.on('end', function() {
    self.stats.application = window.mozTestInfo.appPath;
    var obj = {
      stats: self.stats,
      failures: failures.map(cleanErr),
      passes: passes
    };

    process.stdout.write(JSON.stringify(obj, null, 2));
  });
}

function cleanErr(test) {
  var err = test.err;
  var message = err.message || '';
  var stack = window.xpcError.format(err);
  var index = stack.indexOf(message) + message.length;
  var msg = stack.slice(0, index);
  var actual = err.actual;
  var expected = err.expected;

  return {
    title: test.title,
    fullTitle: test.fullTitle(),
    duration: test.duration,
    stack: stack,
    index: index,
    msg: msg,
    actual: actual,
    expected: expected
  }
};

function average(arr) {
  var sum = arr.reduce(function(i, j) {
    return i + j;
  });

  return sum / arr.length;
};

global.Mocha.reporters.JSONMozPerf = JSONMozPerfReporter;
})(this);
