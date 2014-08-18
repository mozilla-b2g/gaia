/**
 * Initialize a new `Base` reporter for MozTest.
 *
 * @param {Runner} runner is the mocha runner that will run the test
 * @api public
 */

'use strict';

exports = module.exports = BaseMozPerfReporter;

var Mocha = require('mocha'),
    util = require('util');

function BaseMozPerfReporter(runner) {
  Mocha.reporters.Base.call(this, runner);

  var failures = [];
  var passes = [];
  var mozPerfDurations;
  var mozPerfMemory = [];
  var mozPerfGoal = {};

  runner.on('test', function(test) {
    mozPerfDurations = {};
  });

  runner.on('mozPerfDuration', function(content) {
    mozPerfDurations[content.title] = content.values;
  });

  runner.on('mozPerfMemory', function(content) {
    mozPerfMemory = content;
  });

  runner.on('mozPerfGoal', function(content) {
    mozPerfGoal = content;
  });

  runner.on('pass', function(test) {

    if (mozPerfDurations === null || Object.keys(mozPerfDurations).length == 0) {
      // this stuff is specific to mocha implementation. It might break.
      --self.stats.passes;

      var err = new Error('No perf data was reported');

      this.emit('fail', test, err);
      return;
    }

    for (var title in mozPerfDurations) {
      // we can have several measurements for one test, that's why we're
      // rewriting the title (each measurement has a title)
      var fullTitle = test.fullTitle() + ' ' + title;

      // Performance: we shall deal with wildcard
      // Wildcard only on the app. Explicit app has priority.
      var perfGoalKey = fullTitle.trim();
      var perfGoal = mozPerfGoal ? mozPerfGoal[perfGoalKey] : undefined;
      if (mozPerfGoal && !perfGoal) {
        var a = perfGoalKey.split(' > ');
        if (a[1] == process.env.CURRENT_APP) {
          a[1] = '*';
          perfGoalKey = a.join(' > ');
          perfGoal = mozPerfGoal[perfGoalKey];
        }
      }

      passes.push({
        title: test.title + ' ' + title,
        fullTitle: fullTitle,
        duration: test.duration,
        mozPerfDurations: mozPerfDurations[title],
        mozPerfDurationsAverage: average(mozPerfDurations[title]),
        mozPerfMemory: mozPerfMemory[title],
        mozPerfMemoryAverage: averageObjects(mozPerfMemory[title]),
        mozPerfGoal: perfGoal
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

    self.printResult(obj);
  });
}

BaseMozPerfReporter.prototype.printResult = function (obj) {

};


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

function averageObjects(arr) {
  if (!arr) {
    return undefined;
  }
  if (arr.length === 0) {
    return null;
  }
  var total = arr.reduce(function(cur, nxt) {
    for (var part in nxt) {
      for (var type in nxt[part]) {
        if (typeof nxt[part][type] === 'number') {
          cur[part][type] += nxt[part][type];
        }
      }
    }
    return cur;
  }, {
    app: {
      uss: 0,
      pss: 0,
      rss: 0,
      vsize: 0
    },
    system: {
      uss: 0,
      pss: 0,
      rss: 0,
      vsize: 0
    }
  });

  for (var part in total) {
    for (var type in total[part]) {
      total[part][type] = (total[part][type] / arr.length).toFixed(3);
    }
  }

  return total;
}

BaseMozPerfReporter.prototype.__proto__ = Mocha.reporters.Base.prototype;
