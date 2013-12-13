/**
 * Initialize a new `JSON` reporter for MozTest.
 *
 * @param {Runner} runner is the mocha runner that will run the test
 * @api public
 */

'use strict';

exports = module.exports = JSONMozPerfReporter;

var Mocha = require('mocha'),
    util = require('util');

function JSONMozPerfReporter(runner) {
  Mocha.reporters.Base.call(this, runner);

  var failures = [];
  var passes = [];
  var mozPerfDurations;

  runner.on('test', function(test) {
    mozPerfDurations = [];
  });

  runner.on('mozPerfDuration', function(content) {
    mozPerfDurations = content;
  });

  runner.on('pass', function(test) {

    if (mozPerfDurations === null) {
      test.err = new Error('No perf data was reported');
      failures.push(test);
      return;
    }

    for (var title in mozPerfDurations) {
      // we can have several measurements for one test, that's why we're
      // rewriting the title (each measurement has a title)
      passes.push({
        title: test.title + ' ' + title,
        fullTitle: test.fullTitle() + ' ' + title,
        duration: test.duration,
        mozPerfDurations: mozPerfDurations[title],
        mozPerfDurationsAverage: average(mozPerfDurations[title])
      });
    }
  });

  runner.on('fail', function(test, err) {
    failures.push(test);
  });

  var self = this;
  runner.on('end', function() {
    self.stats.application = process.env.CURRENT_APP;
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
  var stack = util.format(err);
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
}

function average(arr) {
  if (arr.length == 0) {
    return 0;
  }
  var sum = arr.reduce(function(i, j) {
    return i + j;
  });

  return sum / arr.length;
}

JSONMozPerfReporter.prototype.__proto__ = Mocha.reporters.Base.prototype;
