suite('run', function() {
  var run = require('../lib/run');
  var project = __dirname + '/fixtures/all/';

  test('allowed missing', function(done) {
    run(project, 'inoexist', done);
  });

  test('required', function(done) {
    run(project, 'inoexist', { required: true }, function(err) {
      assert.ok(err, 'has error');
      assert.ok(err.message.match(/required/), 'is right message:' + err);
      done();
    });
  });

  test('passing script', function(done) {
    var buffer = '';

    function verify(err, status) {
      assert.ok(!err, 'is successful: ' + err);
      assert.ok(status, 'gives status');
      assert.equal(buffer.trim(), 'bashed');
      assert.equal(status.code, 0);
      done();
    }

    var child =
      run(project, 'script', { stdio: 'pipe', required: true }, verify);

    // discard
    child.stderr.on('data', function() {});
    child.stdout.on('data', function(content) {
      buffer += content.toString();
    });
  });
});
