suite('mocha integration', function() {
  var fs = require('fs');
  var path = require('path');

  function aggregateOutput(childProcess) {
    var result = {
      stderr: '',
      stdout: ''
    };

    childProcess.stderr.on('data', function(input) {
      result.stderr += input.toString();
    });

    childProcess.stdout.on('data', function(input) {
      result.stdout += input.toString();
    });

    return result;
  }

  var MS_REGEXP = /(([0-9]+) ?ms)/;
  var NEW_LINES = /(\n|(\s{2,}))/g;
  function waitForProcess(child, done) {
    var result = aggregateOutput(child);
    child.on('exit', function(code) {
      // there are very small newline/whitespace differences between
      // mocha and our marionette reporter... these probably are not
      // bugs but prevent us from verifying real content so they are stripped.
      ['stderr', 'stdout'].forEach(function(field) {
        [MS_REGEXP, NEW_LINES].forEach(function(regex) {
          result[field] = result[field].replace(regex, '').trim();
        });
      });

      // exit status is _really_ important
      result.code = code;
      done();
    });

    return result;
  }

  var tests = [
    // this also tests picking up mocha.opts
    ['test', ['--reporter', 'spec']],
    ['pending', ['--reporter', 'spec']],
    ['with-helper', ['--require', __dirname + '/../fixtures/helper.js']]
  ];

  tests.forEach(function(pair) {
    var file = pair[0];
    var path = __dirname + '/fixtures/' + file;

    var argv = [path].concat(pair[1]);

    // run same test with same options on both mocha & our marionette proxy
    // runner.
    suite(file, function() {
      var mochaOut;
      var marionetteOut;

      setup(function(done) {
        var proc = spawnMocha(argv);
        mochaOut = waitForProcess(proc, done);
      });

      setup(function(done) {
        var proc = spawnMarionette(argv);
        marionetteOut = waitForProcess(proc, done);
      });

      test('code', function() {
        assert.equal(mochaOut.code, marionetteOut.code);
      });

      test('stdout', function() {
        assert.equal(mochaOut.stdout, marionetteOut.stdout);
      });

      test('stderr', function() {
        assert.equal(mochaOut.stderr, marionetteOut.stderr);
      });
    });
  });

  suite('--host', function() {
    var result,
        argv = [
          '--ui', 'tdd',
          '--host', __dirname + '/fixtures/host',
          __dirname + '/fixtures/marionettetest'
        ];

    setup(function(done) {
      var proc = spawnMarionette(argv);
      result = waitForProcess(proc, done);
    });

    test('exits with magic code', function() {
      assert.equal(result.code, 55, JSON.stringify(result));
    });
  });

  suite('--profile-builder', function() {
    var result,
        argv = [
          '--ui', 'tdd',
          '--profile-builder', __dirname + '/fixtures/builder',
          __dirname + '/fixtures/marionettetest'
        ];

    setup(function(done) {
      var proc = spawnMarionette(argv);
      result = waitForProcess(proc, done);
    });

    test('exits with magic code', function() {
      assert.equal(result.code, 66, JSON.stringify(result));
    });
  });

  suite('--manifest', function() {

    test('exits with status code 1 when file is not found', function(done) {
      var filename = 'non-existent-file.json';
      var argv = ['--manifest', filename];
      var proc = spawnMarionette(argv);

      // Ensure that dummy file does not actually exist
      assert.ok(!fs.existsSync(filename));

      result = waitForProcess(proc, function() {
        assert.equal(result.code, 1);
        done();
      });
    });

    test('exits with status code 1 when file is not JSON-formatted',
      function(done) {
      var argv = ['--manifest', __filename];
      var proc = spawnMarionette(argv);
      result = waitForProcess(proc, function() {
        assert.equal(result.code, 1);
        done();
      });
    });

    suite('absolute paths', function() {

      test('blacklisted files', function(done) {
        var argv = [
          '--manifest',
          path.join(__dirname, 'fixtures', 'manifest-blacklist.json'),
          path.join(__dirname, 'fixtures', 'manifest-test-skip.js'),
          path.join(__dirname, 'fixtures', 'manifest-test-use.js')
        ];
        var proc = spawnMarionette(argv);
        result = waitForProcess(proc, function() {
          assert.equal(result.code, 23);
          done();
        });
      });

      test('whitelisted files', function(done) {
        var argv = [
          '--manifest',
          path.join(__dirname, 'fixtures', 'manifest-whitelist.json'),
          path.join(__dirname, 'fixtures', 'manifest-test-skip.js'),
          path.join(__dirname, 'fixtures', 'manifest-test-use.js')
        ];
        var proc = spawnMarionette(argv);
        result = waitForProcess(proc, function() {
          assert.equal(result.code, 23);
          done();
        });
      });

    });

    suite('relative paths', function() {

      test('blacklisted files', function(done) {
        var argv = [
          '--manifest',
          path.join(__dirname, 'fixtures', 'manifest-blacklist.json'),
          path.join('test', 'bin', 'fixtures', 'manifest-test-skip.js'),
          path.join('test', 'bin', 'fixtures', 'manifest-test-use.js')
        ];
        var proc = spawnMarionette(argv);
        result = waitForProcess(proc, function() {
          assert.equal(result.code, 23);
          done();
        });
      });

      test('whitelisted files', function(done) {
        var argv = [
          '--manifest',
          path.join('test', 'bin', 'fixtures', 'manifest-whitelist.json'),
          path.join('test', 'bin', 'fixtures', 'manifest-test-skip.js'),
          path.join('test', 'bin', 'fixtures', 'manifest-test-use.js')
        ];
        var proc = spawnMarionette(argv);
        result = waitForProcess(proc, function() {
          assert.equal(result.code, 23);
          done();
        });
      });

    });

  });

});
