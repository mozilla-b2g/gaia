requireApp('calendar/test/unit/helper.js', function() {
  requireLib('timespan.js');
  requireLib('responder.js');
  requireLib('calc.js');
  requireLib('store/event.js');
});

suite('store/event', function() {
  var subject;
  var db;

  setup(function(done) {
    this.timeout(5000);
    db = testSupport.calendar.db();
    subject = db.getStore('Event');

    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  teardown(function(done) {
    var trans = db.transaction('events', 'readwrite');
    var accounts = trans.objectStore('events');
    var res = accounts.clear();

    res.onerror = function() {
      done(new Error('could not wipe events db'));
    }

    res.onsuccess = function() {
      done();
    }
  });

  teardown(function() {
    db.close();
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.Store.Abstract);
    assert.equal(subject._store, 'events');
    assert.equal(subject.db, db);
    assert.ok(subject._timeObservers);
  });


  test('#_createModel', function() {
    var input = { name: 'foo'};
    var output = subject._createModel(input, 1);
    assert.equal(output._id, 1);
    assert.equal(output.name, output.name);
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
    var date;
    var obj;

    setup(function() {
      obj = {};
      date = new Date(2012, 1, 1);
      span = new Calendar.Timespan(
        new Date(2012, 1, 1),
        new Date(2012, 12, 1)
      );
    });

    function fireSuccess() {
      subject.fireTimeEvent(
        'add',
        date,
        obj
      );
    }

    test('object', function(done) {
      var observer = {
        handleEvent: function(e) {
          done(function() {
            assert.equal(e.time, date);
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
          assert.equal(e.time, date);
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
        new Date(2011, 1, 1),
        obj
      );
    });
  });

  suite('searching', function() {
    var events;
    var lastEvent;

    function d() {
      return new Date(2012, 5, ++lastEvent, lastEvent);
    }

    setup(function(done) {
      lastEvent = 0;

      var trans = subject.db.transaction(
        'events',
        'readwrite'
      );

      trans.oncomplete = function() {
        done();
      }

      for (var i = 0; i < 2; i++) {
        var event = Factory('event.recurring', {
          remote: {
            _recurres: 1,
            startDate: d()
          }
        });
        subject.persist(event, trans);
      }
    });

    test('scan', function(done) {
      this.timeout(5000);
      var trans = subject.db.transaction(
        'events'
      );

      var keyRange = IDBKeyRange.bound(
        new Date(2012, 5, 1),
        new Date(2012, 6, 1),
        true,
        true
      );

      var store = trans.objectStore('events');

      var cursor = store.index('occurs').openCursor(
        keyRange
      );

      var events = [];

      cursor.onsuccess = function(e) {
        var cursor = e.target.result;
        if (cursor) {
          events.push(cursor.value);
          cursor.continue();
        }
      };

      trans.oncomplete = function() {
        var one = events[0];
        var two = events[1];
        done();
      };
    });

  });

  suite('#removeByCalendarId', function() {

    setup(function(done) {
      subject.persist({
        calendarId: 1
      }, done);
    });

    setup(function(done) {
      subject.persist({
        calendarId: 1
      }, done);
    });

    setup(function(done) {
      subject.persist({
        calendarId: 2
      }, done);
    });

    setup(function() {
      assert.equal(
        Object.keys(subject.cached).length, 3,
        'should have some controls'
      );
    });

    test('removed all events for 1', function(done) {
      subject.removeByCalendarId(1, function() {
        var keys = Object.keys(subject.cached);
        assert.equal(
          keys.length, 1,
          'should have removed all but control'
        );


        assert.equal(
          subject.cached[keys[0]].calendarId,
          2,
          'should not have removed control calendar'
        );

        subject._cached = {};
        subject.load(function(err, result) {
          done(function() {
            var loadKeys = Object.keys(result);
            assert.equal(loadKeys.length, 1);
            var obj = result[loadKeys[0]];
            assert.equal(obj.calendarId, 2);
          });
        });
      });
    });
  });


});
