requireApp('calendar/test/unit/helper.js', function() {
  requireLib('timespan.js');
  requireLib('responder.js');
  requireLib('calc.js');
  requireLib('store/event.js');
});

suite('store/event', function() {
  var subject;
  var db;
  var id = 0;

  function event(date) {
    return Factory('event', {
      remote: { startDate: date, _id: ++id }
    });
  }

  function eventRecuring(date) {
    return Factory('event.recurring', {
      remote: {
        startDate: date,
        _id: ++id,
        _recurres: 1
      }
    });
  }

  function time(event, idx) {
    if (typeof(idx) === 'undefined') {
      idx = 0;
    }

    return event.remote.occurs[idx].valueOf();
  }

  setup(function(done) {
    this.timeout(5000);
    id = 0;
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

  suite('event caching', function() {
    var single;
    var recurring;

    suite('cachedSpan', function() {
      var dates;

      function date(date) {
        return dates[date.valueOf()];
      }

      function addEvent(date) {
        var value = date.valueOf();
        dates[value] = event(date);
        subject._addToCache(dates[value]);
      }

      setup(function() {
        dates = {};

        addEvent(new Date(2012, 1, 1));
        addEvent(new Date(2012, 1, 2));
        addEvent(new Date(2012, 1, 3));
        addEvent(new Date(2012, 1, 4));
        addEvent(new Date(2012, 1, 5));
      });

      test('find lower half', function() {
        var result = subject.cachedSpan(
          new Calendar.Timespan(
            new Date(2012, 1, 3),
            new Date(2012, 1, 5)
          )
        );

        assert.deepEqual(
          result,
          [
            date(new Date(2012, 1, 3)),
            date(new Date(2012, 1, 4)),
            date(new Date(2012, 1, 5))
          ]
        );
      });

    });

    suite('#_addToCache', function() {

      setup(function() {
        single = event(
          new Date(2012, 1, 1, 1)
        );

        recurring = eventRecuring(
          new Date(2012, 2, 1)
        );
      });

      test('single added', function() {
        subject._addToCache(single);

        assert.deepEqual(subject._times, [
          time(single)
        ]);

        assert.equal(
          subject.cached[single._id], single
        );

        assert.equal(
          subject._eventsByTime[time(single)][0],
          single
        );
      });

      test('multiple added', function() {
        subject._addToCache(single);
        subject._addToCache(recurring);

        assert.deepEqual(subject._times, [
          time(single),
          time(recurring, 0),
          time(recurring, 1)
        ]);

        assert.equal(
          subject._eventsByTime[time(single)][0],
          single
        );

        assert.equal(
          subject._eventsByTime[time(recurring)][0],
          recurring
        );

        assert.equal(
          subject._eventsByTime[time(recurring, 1)][0],
          recurring
        );
      });
    });

    suite('#_freeCachedRange', function(done) {

      var calledWith;
      var beforeSingle;
      var recurring;
      var afterSingle;
      var span;

      setup(function() {
        beforeSingle = event(
          new Date(2012, 1, 1)
        );

        recurring = eventRecuring(
          new Date(2012, 2, 1)
        );

        afterSingle = event(
          new Date(2012, 2, 5)
        );

        span = new Calendar.Timespan(
          time(beforeSingle),
          time(recurring, 0)
        );

        subject._addToCache(recurring);
        subject._addToCache(afterSingle);
        subject._addToCache(beforeSingle);

        subject.observeTime(span, function(e) {
          done(function() {
            assert.equal(e.time, span);
          });
        });

        var start = window.performance.now();
        // twice intentionally to show it has no effect.
        subject._freeCachedRange(span);
        subject._freeCachedRange(span);
        var end = window.performance.now();

      });

      test('result', function() {
        assert.ok(
          !subject.cached[beforeSingle._id],
          'remove events before span'
        );

        assert.ok(
          subject.cached[recurring._id],
          'should not remove events partially covering span'
        );

        assert.ok(
          subject.cached[afterSingle._id],
          'should not remove events outside of span'
        );

        var expectedTimes = [
          time(recurring, 1),
          time(afterSingle)
        ];

        assert.deepEqual(
          subject._times,
          expectedTimes
        );
      });
    });

    suite('#_removeFromCache', function() {
      setup(function() {
        single = event(
          new Date(2012, 1, 1, 1)
        );

        recurring = eventRecuring(
          new Date(2012, 2, 1)
        );

        subject._addToCache(single);
        subject._addToCache(recurring);
      });

      test('remove recurring', function() {
        subject._removeFromCache(recurring._id);
        var expectedCached = Object.create(null);
        expectedCached[single._id] = single;

        assert.deepEqual(
          subject.cached,
          expectedCached
        );

        assert.deepEqual(
          subject._times,
          [time(single)]
        );

        assert.equal(
          subject._eventsByTime[time(single)][0],
          single
        );

        assert.equal(
          subject._eventsByTime[time(single)][0],
          single
        );
      });

      test('remove single', function() {
        subject._removeFromCache(single._id);
        var expectedCached = Object.create(null);
        expectedCached[recurring._id] = recurring;

        assert.deepEqual(
          subject.cached,
          expectedCached
        );

        assert.deepEqual(
          subject._times,
          [time(recurring), time(recurring, 1)]
        );

        assert.equal(
          subject._eventsByTime[time(recurring, 1)][0],
          recurring
        );

        assert.equal(
          subject._eventsByTime[time(recurring)][0],
          recurring
        );
      });

    });

  });

  suite('#_handleSpanChange', function() {
    var oldSpan;
    var newSpan;
    var calledWith;
    var result;

    setup(function() {
      calledWith = null;
      oldSpan = new Calendar.Timespan(
        new Date(2012, 1, 1),
        new Date(2012, 1, 10)
      );

      subject._cachedSpan = oldSpan;

      newSpan = new Calendar.Timespan(
        new Date(2012, 1, 5),
        new Date(2012, 1, 15)
      );

      subject._freeCachedRange = function() {
        calledWith = arguments[0];
      }
    });

    test('when new is in range of old', function() {
      result = subject._handleSpanChange(
        oldSpan
      );

      assert.equal(calledWith, null);
      assert.isFalse(result);
    });

    test('when no existing span', function() {
      subject._cachedSpan = null;
      result = subject._handleSpanChange(
        newSpan
      );

      assert.equal(calledWith, null);
      assert.notEqual(newSpan, result);

      // no cache load whole request
      assert.equal(
        newSpan.start,
        result.start,
        'should start at same time as request'
      );

      assert.equal(
        newSpan.end,
        result.end,
        'should end at same time as request'
      );
    });

    test('drop and skip', function() {
      result = subject._handleSpanChange(
        newSpan
      );

      assert.instanceOf(result, Calendar.Timespan);
      assert.instanceOf(calledWith, Calendar.Timespan);

      assert.notEqual(
        oldSpan,
        calledWith,
        'should not pass/mutate old span'
      );

      assert.notEqual(
        newSpan,
        oldSpan,
        'should not pass/mutate new span'
      );

      assert.equal(
        calledWith.start,
        oldSpan.start,
        'should call free with same start'
      );

      assert.equal(
        calledWith.end,
        newSpan.start - 1,
        'should free just before start new new span'
      );

      assert.equal(
        result.start,
        oldSpan.end + 1,
        'should request load of everything just after cache'
      );

      assert.equal(
        result.end,
        newSpan.end
      );
    });

  });

  suite('#loadSpan', function() {

    var events;
    var span;
    var timeEvents;

    setup(function() {
      events = {};
      timeEvents = [];
    });

    function persistEvent(date) {
      setup(function(done) {
        subject.persist(event(date), function(err, id, model) {
          events[date.valueOf()] = model;
          done();
        });
      });
    }

    persistEvent(new Date(2012, 1, 1));
    persistEvent(new Date(2012, 1, 2));
    persistEvent(new Date(2012, 1, 3));
    persistEvent(new Date(2012, 1, 4));

    setup(function(done) {
      span = new Calendar.Timespan(
        new Date(2012, 1, 1),
        new Date(2012, 1, 2)
      );

      subject._cached = Object.create(null);
      subject._times = [];
      subject._eventsByTime = Object.create(null);

      subject.observeTime(span, function(e) {
        timeEvents.push(e);
      });

      subject.loadSpan(span, function(err) {
        done();
      });
    });

    test('initial load', function() {
      function byDate(idx) {
        return events[dates[idx]];
      }

      var dates = [
        new Date(2012, 1, 1).valueOf(),
        new Date(2012, 1, 2).valueOf()
      ];

      var cached = Object.create(null);

      cached[byDate(0)._id] = byDate(0);
      cached[byDate(1)._id] = byDate(1);

      assert.deepEqual(subject.cached, cached);

      assert.deepEqual(
        subject._times,
        dates,
        'should load events in range'
      );

      assert.deepEqual(
        subject._eventsByTime[dates[0]][0],
        byDate(0)
      );

      assert.deepEqual(
        subject._eventsByTime[dates[1]][0],
        byDate(1)
      );

      assert.equal(
        timeEvents.length,
        2,
        'should fire time events'
      );

      assert.deepEqual(
        timeEvents[1],
        {
          data: byDate(1),
          time: dates[1],
          type: 'load'
        }
      );

      assert.deepEqual(
        timeEvents[0],
        {
          data: byDate(0),
          time: dates[0],
          type: 'load'
        }
      );

    });

  });

  suite('find', function() {
    var events;
    var lastEvent;

    function d() {
      return new Date(2012, 5, ++lastEvent, lastEvent);
    }

    setup(function(done) {
      var i = 0;
      lastEvent = 0;

      var trans = subject.db.transaction(
        'events',
        'readwrite'
      );

      trans.oncomplete = function() {
        done();
      }

      var event;

      for (i = 0; i < 5; i++) {
        event = Factory('event', {
          remote: { startDate: d() }
        });

        subject.persist(event, trans);
      }

      for (i = 0; i < 2; i++) {
        event = Factory('event.recurring', {
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
        new Date(2012, 7, 1),
        true,
        true
      );

      var store = trans.objectStore('events');

      var cursor = store.index('occurs').openCursor(
        keyRange
      );

      var times = [];
      var events = {};
      var eventsByTime = {};


      cursor.onsuccess = function(e) {
        var cursor = e.target.result;

        if (cursor) {
          var id = cursor.value._id;
          var time = cursor.key.valueOf();

          if (!(id in events)) {
            events[id] = cursor.value;
          }

          if (!(time in eventsByTime)) {
            eventsByTime[time] = [];
            times.push(time);
          }

          eventsByTime[time].push(cursor.value);
          cursor.continue();
        }
      };

      trans.oncomplete = function() {
        done();
      };
    });

  });

  suite('#removeByCalendarId', function() {

    function persistEvent(calendarId) {
      setup(function(done) {
        var event = Factory('event', {
          calendarId: calendarId
        });

        subject.persist(event, done);
      });
    }

    persistEvent(1);
    persistEvent(1);
    persistEvent(2);

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
