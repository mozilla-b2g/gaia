/**
 * Initialize a new `JSON` reporter for MozTest.
 *
 * @param {Runner} runner
 * @api public
 */


module.exports = JSONMozTestReporter;

function JSONMozTestReporter(runner) {
  var self = this;
  global.Mocha.reporters.Base.call(this, runner);

  var tests = [];
  var failures = [];
  var passes = [];

  runner.on('test end', function(test) {
    tests.push(test);
  });

  runner.on('pass', function(test) {
    passes.push(test);
  });

  runner.on('fail', function(test) {
    failures.push(test);
  });

  runner.on('end', function() {
    var obj = {
      stats: self.stats,
      tests: tests.map(clean),
      failures: failures.map(cleanErr),
      passes: passes.map(clean)
    };

    process.stdout.write(JSON.stringify(obj, null, 2));
  });
}

/**
 * Return a plain-object representation of `test`
 * free of cyclic properties etc.
 *
 * @param {Object} test
 * @return {Object}
 * @api private
 */

function clean(test) {
  return {
    title: test.title,
    fullTitle: test.fullTitle(),
    duration: test.duration
  };
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
}
