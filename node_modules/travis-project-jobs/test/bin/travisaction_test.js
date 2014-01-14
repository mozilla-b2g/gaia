suite('travisaction', function() {
  var exec = require('child_process').exec,
      fixtures = __dirname + '/../fixtures',
      projectAll = 'all',
      projectMissing = 'missing';

  /**
   * Invokes the travisaction binary.
   */
  function action(project, action, callback) {
    var cmd = [
      __dirname + '/../../bin/travisaction',
      '--root',
      fixtures,
      project,
      action
    ];

    return exec(cmd.join(' '), callback);
  }

  test('success: script', function(done) {
    action(projectAll, 'script', function(err, stdout) {
      assert.ok(!err, 'is successful: ' + err);
      assert.equal(stdout.trim(), 'bashed');
      done();
    });
  });

  test('failure: script', function(done) {
    action(projectMissing, 'script', function(err, stdout, stderr) {
      assert.ok(err, 'has error: ' + err);
      assert.ok(
        stderr.indexOf('script') !== -1,
        stderr + ' contains "script"'
      );
      done();
    });
  });

});
