requireLib('timespan.js');
requireLib('time_observer.js');

suite('time_observer', function() {

  var subject;
  var SubjectClass;

  suiteSetup(function() {
    SubjectClass = function() {
      Calendar.TimeObserver.call(this);
    };

    Calendar.TimeObserver.enhance(
      SubjectClass.prototype
    );
  });

  setup(function() {
    subject = new SubjectClass();
  });

  test('#findTimeObserver', function() {
    var cb = {};
    var range = new Calendar.Timespan(
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
      }, /Calendar\.Timespan/);
    });

    test('success', function() {
      var span = new Calendar.Timespan(
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
      span = new Calendar.Timespan(
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

      span = new Calendar.Timespan(
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
      this.timeout(250);

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
      this.timeout(250);

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
  });

});
