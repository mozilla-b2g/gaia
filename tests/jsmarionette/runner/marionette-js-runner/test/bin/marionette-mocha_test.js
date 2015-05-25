/* global assert, spawnMarionette, spawnMocha */
'use strict';
suite('mocha integration', function() {
  this.timeout('30s');
  var fs = require('fs');
  var fsPath = require('path');

  function aggregateOutput(childProcess) {
    var result = {
      stderr: '',
      stdout: ''
    };

    childProcess.stderr.on('data', function(out) {
      result.stderr += out;
    });

    childProcess.stdout.on('data', function(out) {
      result.stdout += out;
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
          result[field + 'Raw'] = result[field];
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
    ['test', [
      '--reporter',
      fsPath.resolve(
        __dirname,
        '/../../node_modules/mocha/lib/reporters/spec'
      )
    ]],
    ['pending', ['--reporter', 'spec']],
    ['with-helper', [
        '--require', fsPath.resolve(__dirname + '/../fixtures/helper.js'),
        '--reporter', 'spec'
      ]
    ]
  ];

  tests.forEach(function(pair) {
    var file = pair[0];
    var path = fsPath.resolve(__dirname + '/../fixtures/' + file);

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
        assert.equal(
          JSON.stringify(mochaOut.code), JSON.stringify(marionetteOut.code)
        );
      });

      test('stdout', function() {
        assert.equal(mochaOut.stdout, marionetteOut.stdout);
      });

      test.skip('stderr', function() {
        assert.equal(mochaOut.stderr, marionetteOut.stderr);
      });
    });
  });

  suite('--host', function() {
    var result;
    var argv = ['--host', __dirname + '/fixtures/host'];
    var Host = require('./fixtures/host');

    suite('when passing --help', function() {
      setup(function(done) {
        var proc = spawnMarionette(argv.concat(['--help']));
        result = waitForProcess(proc, done);
      });

      test('custom help is shown', function() {
        assert.ok(result.stdoutRaw.indexOf(Host.help.group.title) !== -1);
        assert.ok(result.stdoutRaw.indexOf(Host.help.group.description) !== -1);
        assert.ok(result.stdoutRaw.indexOf('--code') !== -1);
      });
    });

    suite('run a test', function() {
      setup(function(done) {
        var proc = spawnMarionette(argv.concat([
          __dirname + '/fixtures/marionettetest',
          '--code',
          '55'
        ]));
        result = waitForProcess(proc, done);
      });

      test('exits with magic code', function() {
        assert.equal(result.code, 55, JSON.stringify(result));
      });
    });

  });

  suite('--profile-builder', function() {
    var result,
        argv = [
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

  suite('--marionette-capabilities', function() {
    var result,
    capabilitiesPath = __dirname + '/fixtures/capabilities.json',
    expected = JSON.stringify({ capabilities: require(capabilitiesPath) }),
    argv = [
      '--marionette-capabilities', capabilitiesPath,
      '--host-log', 'stdout',
      __dirname + '/fixtures/marionettetest'
    ];

    setup(function(done) {
      var proc = spawnMarionette(argv);
      result = waitForProcess(proc, done);
    });

    test('desired capabilities are set', function() {
      assert.ok(result.stdoutRaw.indexOf(expected) !== -1);
    });
  });

  suite('--device-type', function() {
    var result,
    devicesPath = __dirname + '/fixtures/devices.json',
    tests = require(devicesPath),
    argv = [
      '--device-type', 'phone',
      '--host-log', 'stdout',
      __dirname + '/fixtures/marionettedevicetest'
    ];

    setup(function(done) {
      var proc = spawnMarionette(argv);
      result = waitForProcess(proc, done);
    });

    test('desired devices is being tested', function() {
      assert.ok(result.stdoutRaw.indexOf(tests.phone) !== -1);
      assert.ok(result.stdoutRaw.indexOf(tests.common) !== -1);
      assert.ok(result.stdoutRaw.indexOf(tests.tv) === -1);
    });
  });

  suite('--host-log=stdout', function() {
    var result,
    argv = [
      '--host-log', 'stdout',
      __dirname + '/fixtures/marionettetest'
    ];

    setup(function(done) {
      var proc = spawnMarionette(argv);
      result = waitForProcess(proc, done);
    });

    test('has marionette output', function() {
      assert.ok(result.stdout.indexOf('newSession') !== -1);
      assert.ok(result.stderr.indexOf('newSession') === -1);
    });
  });

  suite('--host-log=stderr', function() {
    var result,
    argv = [
      '--host-log', 'stderr',
      __dirname + '/fixtures/marionettetest'
    ];

    setup(function(done) {
      var proc = spawnMarionette(argv);
      result = waitForProcess(proc, done);
    });

    test('has marionette output', function() {
      assert.ok(result.stderr.indexOf('newSession') !== -1);
      assert.ok(result.stdout.indexOf('newSession') !== 0);
    });
  });

  suite('--host-log=<file>', function() {
    var file = __dirname + '/log.txt';
    var result,
    argv = [
      '--host-log', file,
      __dirname + '/fixtures/marionettetest'
    ];

    setup(function(done) {
      var proc = spawnMarionette(argv);
      result = waitForProcess(proc, done);
    });

    teardown(function() {
      fs.unlinkSync(file);
    });

    test('has marionette output', function() {
      assert.ok(fs.existsSync(file));
      assert.ok(fs.readFileSync(file, 'utf8').indexOf('newSession') !== -1);
    });
  });

});
