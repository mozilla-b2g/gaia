/**
 * @fileoverview A test that runs marionette-mocha on a test that logs
 *               something to exercise the marionette logger when
 *               --verbose is turned on.
 */
var exec = require('child_process').exec;


suite('console proxy', function() {
  test('log', function(done) {
    exec('make test-logger', function(err, stdout, stderr) {
      assert.ok(!err);
      assert.ok(stdout.indexOf('What does the fox say') !== -1);
      done();
    });
  });
});
