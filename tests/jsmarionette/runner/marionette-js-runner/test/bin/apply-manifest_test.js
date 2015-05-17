/* global assert */
'use strict';
suite('apply-manifest', function() {
  var exec = require('child_process').exec;
  var ROOT = __dirname + '/../../';
  var BIN = ROOT + '/bin/apply-manifest';

  test('manifest-blacklist.json', function(done) {
    var argv = [
      BIN,
      __dirname + '/fixtures/manifest-blacklist.json',
      'test/bin/fixtures/manifest-test-skip.js',
      'test/bin/fixtures/manifest-test-use.js'
    ];

    exec(argv.join(' '), { cwd: ROOT }, function(err, stdout) {
      if (err) return done(err);
      assert.equal(
        stdout.trim(),
        __dirname + '/fixtures/manifest-test-use.js'
      );
      done();
    });
  });

  test('manifest-whitelist.json', function(done) {
    var argv = [
      BIN,
      __dirname + '/fixtures/manifest-whitelist.json',
      'test/bin/fixtures/manifest-test-skip.js',
      'test/bin/fixtures/manifest-test-use.js'
    ];

    exec(argv.join(' '), { cwd: ROOT }, function(err, stdout) {
      if (err) return done(err);
      assert.equal(
        stdout.trim(),
        __dirname + '/fixtures/manifest-test-use.js'
      );
      done();
    });
  });
});
