
var TBPL = require('../lib/tbpl'),
    assert = require('assert'),
    sinon = require('sinon');

suite('TBPL', function() {
  var runner, spy, subject;

  setup(function() {
    runner = {
      on: function(type, listener) {}
    };

    spy = sinon.spy(runner, 'on');
    subject = new TBPL(runner);
  });

  test('#constructor', function() {
    sinon.assert.calledWith(spy, 'end');
    sinon.assert.calledWith(spy, 'fail');
    sinon.assert.calledWith(spy, 'pass');
    sinon.assert.calledWith(spy, 'pending');
    sinon.assert.calledWith(spy, 'test');
    sinon.assert.calledWith(spy, 'test end');
    assert.strictEqual(subject.failing, 0);
    assert.strictEqual(subject.passing, 0);
    assert.strictEqual(subject.pending, 0);
  });

  test('#onEnd', function() {
    var stub = sinon.stub(console, 'log');
    subject.onEnd();
    console.log.restore();

    assert.ok(stub.calledWith('*~*~* Results *~*~*'));
    assert.ok(stub.calledWith('%d passing', 0));
    assert.ok(stub.calledWith('%d failing', 0));
    assert.ok(stub.calledWith('%d pending', 0));
  });

  test('#onFail', function() {
    var failing = subject.failing;
    var stub = sinon.stub(console, 'log');
    subject.onFail({
      fullTitle: function() {
        return 'some title';
      }
    });
    console.log.restore();

    assert.strictEqual(subject.failing, failing + 1);
    assert.ok(
        stub.calledWith('TEST-UNEXPECTED-FAIL | %s', 'some title'));
  });

  test('#onPass', function() {
    var passing = subject.passing;
    var stub = sinon.stub(console, 'log');
    subject.onPass({
      fullTitle: function() {
        return 'some title';
      }
    });
    console.log.restore();

    assert.strictEqual(subject.passing, passing + 1);
    assert.ok(
        stub.calledWith('TEST-PASS | %s', 'some title'));
  });

  test('#onPending', function() {
    var pending = subject.pending;
    var stub = sinon.stub(console, 'log');
    subject.onPending({
      fullTitle: function() {
        return 'some title';
      }
    });
    console.log.restore();

    assert.strictEqual(subject.pending, pending + 1);
    assert.ok(
        stub.calledWith('TEST-PENDING | %s', 'some title'));
  });

  test('#onTest', function() {
    var stub = sinon.stub(console, 'log');
    subject.onTest({
      fullTitle: function() {
        return 'some title';
      }
    });
    console.log.restore();

    assert.ok(
        stub.calledWith('TEST-START | %s', 'some title'));
  });

  test('#onTestEnd', function() {
    var stub = sinon.stub(console, 'log');
    subject.onTestEnd({
      fullTitle: function() {
        return 'some title';
      }
    });
    console.log.restore();

    assert.ok(
        stub.calledWith('TEST-END | %s', 'some title'));
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
