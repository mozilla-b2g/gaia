define(function(require) {
'use strict';

var Timespan = require('timespan');
var TimeObserver = require('time_observer');

suite('time_observer', function() {
  var subject;
  var SubjectClass;

  suiteSetup(function() {
    SubjectClass = function() {
      TimeObserver.call(this);
    };

    TimeObserver.enhance(
      SubjectClass.prototype
    );
  });

  setup(function() {
    subject = new SubjectClass();
  });

  test('#findTimeObserver', function() {
    var cb = {};
    var range = new Timespan(
      new Date(),
      new Date()
    );

    assert.equal(
      subject.findTimeObserver(range, cb),
      -1
    );

    subject.observeTime(range, cb);

    assert.equal(
      subject.findTimeObserver(range, cb),
      0
    );
  });

  suite('#observeTime', function() {
    test('when given non-timespan', function() {
      assert.throws(function() {
        subject.observeTime('foo', function() {});
      }, /Timespan/);
    });

    test('success', function() {
      var span = new Timespan(
        new Date(),
        new Date()
      );

      var cb = function() {};

      subject.observeTime(span, cb);

      assert.equal(
        subject._timeObservers.length, 1
      );

      var observe = subject._timeObservers[0];

      assert.equal(observe[0], span);
      assert.equal(observe[1], cb);

    });

  });

  suite('#removeTimeObserver', function() {
    var span, object;

    setup(function() {
      span = new Timespan(
        new Date(),
        new Date()
      );

      object = {};
      subject.observeTime(span, object);
    });

    test('found & removed', function() {
      var result = subject.removeTimeObserver(
        span, object
      );

      assert.isTrue(result);
      assert.equal(subject._timeObservers.length, 0);
    });

    test('not removed', function() {
      var result = subject.removeTimeObserver(
        span,
        {}
      );

      assert.isFalse(result);
      assert.equal(subject._timeObservers.length, 1);
    });
  });

  suite('#fireTimeEvent', function() {
    var span;

    var startDate;
    var endDate;

    var obj;

    setup(function() {
      obj = {};
      startDate = new Date(2011, 12, 31);
      endDate = new Date(2012, 1, 15);

      span = new Timespan(
        new Date(2012, 1, 1),
        new Date(2012, 12, 1)
      );
    });

    function fireSuccess() {
      subject.fireTimeEvent(
        'add',
        startDate,
        endDate,
        obj
      );
    }

    test('object', function(done) {
      var observer = {
        handleEvent: function(e) {
          done(function() {
            assert.equal(e.time, true);
            assert.equal(e.type, 'add');
            assert.equal(e.data, obj);
          });
        }
      };
      subject.observeTime(span, observer);
      fireSuccess();
    });

    test('function', function(done) {
      subject.observeTime(span, function(e) {
        done(function() {
          assert.equal(e.time, true);
          assert.equal(e.type, 'add');
          assert.equal(e.data, obj);
        });
      });
      fireSuccess();
    });

    test('outside of range', function(done) {
      setTimeout(function() {
        done();
      }, 0);

      subject.observeTime(span, function() {
        done(new Error('should not fire observe'));
      });

      subject.fireTimeEvent(
        'remove',
        new Date(2010, 1, 1),
        new Date(2011, 1, 1),
        obj
      );
    });

    test('same date', function(done) {
      // yahoo calendar sets endDate and startDate as same value when creating
      // an all day recurring event
      startDate = new Date(2012, 5, 5);
      endDate = new Date(2012, 5, 5);

      subject.observeTime(span, function(e) {
        done(function() {
          assert.equal(e.time, true);
          assert.equal(e.type, 'add');
          assert.equal(e.data, obj);
        });
      });
      fireSuccess();
    });

  });
});

});
