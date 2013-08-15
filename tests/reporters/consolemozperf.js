/**
 * Initialize a new `Console` reporter for MozTest.
 *
 * @param {Runner} runner is the mocha runner that will run the test
 */

'use strict';

(function(global) {

function ConsoleMozPerfReporter(runner) {
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

    process.stdout.write(generateConsoleOut(obj));
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
  };
};

function average(arr) {
  var sum = arr.reduce(function(i, j) {
    return i + j;
  });

  return sum / arr.length;
};

function generateConsoleOut(objOut) {
  var consoleOut = 'Application: ' + objOut.stats.application + '\n\n';
  consoleOut += 'Stats: \n';
  for (var key in objOut.stats) {
    if (objOut.stats[key] != null)
      consoleOut += '  ' + key + ': ' + objOut.stats[key] + '\n';
  }

  consoleOut += '\nFailures: \n';

  var failures = objOut.failures;
  if (failures.length == 0) {
    consoleOut += '  No test failed\n\n';
  } else {
    for (var i = 0; i < failures.length; i++) {
      for (var key in failures[i]) {
        if (failures[i][key] != null)
          consoleOut += '  ' + key + ': ' + failures[i][key] + '\n';
      }
      consoleOut += '\n';
    }
  }

  consoleOut += '\nPasses: \n';

  var passes = objOut.passes;

  if (passes.length == 0) {
    consoleOut += '  No test passed\n\n';
  } else {
    for (var i = 0; i < passes.length; i++) {
      for (var key in passes[i]) {
        if (passes[i][key] != null)
          consoleOut += '  ' + key + ': ' + passes[i][key] + '\n';
      }
      consoleOut += '\n';
    }
  }

  consoleOut += '-----------------------------------';

  return consoleOut;
}



global.Mocha.reporters.ConsoleMozPerf = ConsoleMozPerfReporter;
})(this);
