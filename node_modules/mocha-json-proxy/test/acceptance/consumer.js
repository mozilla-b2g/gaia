suite('reporter', function() {
  var mocha = require('mocha'),
      Consumer = require('../../consumer');

  var testType = process.env.FIXTURE;
  var reporterType = process.env.REPORTER;

  function testReporter(reporterType) {
    suite(reporterType, function() {
      ['pass', 'fail', 'pending'].forEach(function(testType) {
        test(test, function(done) {
          var child = forkFixture(testType);
          var runner = new Consumer(child);
          var reporter = new mocha.reporters[reporterType](runner);

          runner.once('end', done);
        });
      });
    });
  }

  if (testType || reporterType) {
    return testReporter();
  }

  [
    'Spec',
    'List',
    //'TAP',
    //'Doc',
    'Dot',
    'Min',
    'JSON',
    'JSONStream',
    //'Markdown',
    'Nyan',
    'Progress',
    'List'
  ].forEach(function(reporter) {
    testReporter(reporter);
  });

});
