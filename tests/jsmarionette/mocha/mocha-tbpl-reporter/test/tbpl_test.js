'use strict';
var TBPL = require('../lib/tbpl'),
    assert = require('assert'),
    sinon = require('sinon');

suite('TBPL', function() {
  var subject, runner, on, log;

  setup(function() {
    runner = {
      on: function(type, listener) {}
    };

    on = sinon.spy(runner, 'on');
    log = sinon.spy(console, 'log');
    subject = new TBPL(runner);
  });

  teardown(function() {
    on.restore();
    log.restore();
  });

  test('#constructor', function() {
    sinon.assert.calledWith(on, 'end');
    sinon.assert.calledWith(on, 'fail');
    sinon.assert.calledWith(on, 'pass');
    sinon.assert.calledWith(on, 'pending');
    sinon.assert.calledWith(on, 'test');
    sinon.assert.calledWith(on, 'test end');
    assert.strictEqual(subject.failing, 0);
    assert.strictEqual(subject.passing, 0);
    assert.strictEqual(subject.pending, 0);
  });

  test('#onEnd', function() {
    subject.onEnd();
    assert.ok(log.calledWith('*~*~* Results *~*~*'));
    assert.ok(log.calledWith('passed: %d', 0));
    assert.ok(log.calledWith('failed: %d', 0));
    assert.ok(log.calledWith('todo: %d', 0));
  });

  test('#onFail', function() {
    var failing = subject.failing;
    var file = 'doge_such_broke_test.js';
    var err = new Error('xfoo');
    subject.onFail(
      {
        file: file,
        fullTitle: function() {
          return 'some title';
        }
      },
      err
    );

    assert.strictEqual(subject.failing, failing + 1);
    assert.ok(log.calledWith(
      'TEST-UNEXPECTED-FAIL | %s | %s',
      file,
      'some title'
    ));
    assert.ok(log.calledWith(err.stack));
  });

  test('#onPass', function() {
    var passing = subject.passing;
    subject.onPass({
      file: 'file.js',
      fullTitle: function() {
        return 'some title';
      }
    });

    assert.strictEqual(subject.passing, passing + 1);
    assert.ok(log.calledWith('TEST-PASS | %s | %s', 'file.js', 'some title'));
  });

  test('#onPending', function() {
    var pending = subject.pending;
    subject.onPending({
      file: 'file.js',
      fullTitle: function() {
        return 'some title';
      }
    });

    assert.strictEqual(subject.pending, pending + 1);
    assert.ok(
      log.calledWith('TEST-PENDING | %s | %s', 'file.js', 'some title')
    );
  });

  test('#onTest', function() {
    subject.onTest({
      file: 'file.js',
      fullTitle: function() {
        return 'some title';
      }
    });

    assert.ok(log.calledWith('TEST-START | %s | %s', 'file.js', 'some title'));
  });

  test('#onTestEnd', function() {
    subject.onTestEnd({
      duration: 100,
      file: 'file.js',
      fullTitle: function() {
        return 'some title';
      }
    });

    assert.ok(
      log.calledWith(
        'TEST-END | %s | %s took %d ms', 'file.js', 'some title', 100
      )
    );
  });

  test('#getFile - relative', function() {
    var file = subject.getFile({
      file: __dirname + '/xfoo'
    });
    assert.equal(
      file,
      'tests/jsmarionette/mocha/mocha-tbpl-reporter/test/xfoo'
    );
  });

  test('#getFile - relative different pwd', function() {
    var file = subject.getFile({
      file: 'woot/bar.js'
    });
    assert.equal(file, 'woot/bar.js');
  });

  test('#getFile - absolute', function() {
    var file = subject.getFile({
      file: '/magic/foo/bar/file.js'
    });
    assert.equal(file, '/magic/foo/bar/file.js');
  });

  test('#getTitle', function() {
    var result = subject.getTitle({
      fullTitle: function() {
        return 'some title TEST-END';
      }
    });

    assert.equal(result, 'some title ********');
  });

  test('#sanitize', function() {
    var str = 'Fuzzy PROCESS-CRASH was a TEST-END, ' +
              'fuzzy TEST-KNOWN-FAIL had no TEST-PASS, ' +
              'fuzzy TEST-START wasn\'t TEST-UNEXPECTED-FAIL was he?';
    var result = subject.sanitize(str);
    assert.equal(result,
        'Fuzzy ************* was a ********, ' +
        'fuzzy *************** had no *********, ' +
        'fuzzy *********** wasn\'t ******************** was he?');
  });
});
