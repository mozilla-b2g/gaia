suite('dmg', function() {
  var assert = require('assert'),
      dmg = require('../index'),
      fs = require('fs'),
      fsPath = require('path');

  var fixture = __dirname + '/fixtures/test.dmg';

  suite('#mount / unmount', function(done) {
    var expectedText = 'was on the dmg';
    var path;

    setup(function(done) {
      dmg.mount(fixture, function(err, _path) {
        if (err) return done(err);
        path = _path;
        done();
      });
    });

    test('read dmg contents', function() {
      assert.ok(fs.existsSync(path));
      var testFile = fsPath.join(path, 'test.txt');

      assert.equal(
        fs.readFileSync(testFile, 'utf8'),
        expectedText,
        'can read off dmg'
      );
    });

    test('unmount dmg', function(done) {
      dmg.unmount(path, function() {
        assert.ok(!fs.existsSync(path));
        done();
      });
    });

    teardown(function(done) {
      if (!fs.existsSync(path))
        return done();

      dmg.unmount(path, done);
    });
  });
});
