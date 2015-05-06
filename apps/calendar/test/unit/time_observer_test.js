define(function(require) {
'use strict';

var timeObserver = require('time_observer');

suite('time_observer', function() {
  var subject;
  var MINUTE = 60 * 1000;
  var DAY = 24 * 60 * MINUTE;

  suiteSetup(function() {
    subject = timeObserver;
  });

  suite('minuteChange', function() {
    var clock;

    setup(function() {
      clock = sinon.useFakeTimers((new Date(2015, 3, 15)).getTime());
    });

    teardown(function() {
      subject._stop();
      subject.removeAllListeners();
      clock.restore();
    });

    test('#add', function() {
      var prev = (new Date()).getMinutes();
      var count = 0;
      subject.on('minute', function() {
        count += 1;
        var cur = (new Date()).getMinutes();
        assert.notEqual(prev, cur);
        prev = cur;
      });
      // need to make sure that callback is only triggered when minute changes
      clock.tick(MINUTE);
      clock.tick(1000);
      clock.tick(MINUTE);
      clock.tick(20 * 1000);
      clock.tick(MINUTE);
      assert.equal(count, 3);
    });

    test('#once', function() {
      var count = 0;
      subject.once('minute', function() {
        count += 1;
      });
      clock.tick(MINUTE);
      clock.tick(MINUTE);
      clock.tick(MINUTE);
      assert.equal(count, 1);
    });

    test('#remove', function(done) {
      var cb = function() {
        assert.fail('should not be called');
      };
      subject.on('minute', cb);
      subject.off('minute', cb);
      clock.tick(MINUTE);
      done();
    });
  });

  suite('dayChange', function() {
    var clock;

    setup(function() {
      clock = sinon.useFakeTimers((new Date(2015, 3, 15)).getTime());
    });

    teardown(function() {
      subject._stop();
      subject.removeAllListeners();
      clock.restore();
    });

    test('#add', function() {
      var prev = (new Date()).getDate();
      var count = 0;
      subject.on('day', function() {
        count += 1;
        var cur = (new Date()).getDate();
        assert.notEqual(prev, cur);
        prev = cur;
      });
      // need to make sure that callback is only triggered when day changes
      clock.tick(MINUTE);
      clock.tick(DAY);
      clock.tick(MINUTE);
      clock.tick(MINUTE);
      clock.tick(DAY);
      clock.tick(DAY);
      assert.equal(count, 3);
    });

    test('#once', function() {
      var count = 0;
      subject.once('day', function() {
        count += 1;
      });
      clock.tick(DAY);
      clock.tick(DAY);
      clock.tick(DAY);
      assert.equal(count, 1);
    });

    test('#remove', function(done) {
      var cb = function() {
        assert.fail('should not be called');
      };
      subject.on('day', cb);
      subject.off('day', cb);
      clock.tick(DAY);
      done();
    });
  });

  suite('_toggleStatusOnVisibilityChange', function() {
    var mock;
    setup(function() {
      mock = sinon.mock(subject);
    });
    teardown(function() {
      mock.restore();
    });

    test('hidden', function() {
      mock.expects('_stop').once();
      mock.expects('_start').never();
      mock.expects('_exec').never();
      subject._toggleStatusOnVisibilityChange(true);
      mock.verify();
    });

    test('visible', function() {
      mock.expects('_stop').never();
      mock.expects('_start').once();
      mock.expects('_exec').once();
      subject._toggleStatusOnVisibilityChange(false);
      mock.verify();
    });
  });

});
});
