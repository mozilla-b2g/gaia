requireLib('timespan.js');
requireLib('interval_tree.js');

window.page = window.page || {};

suite('Controllers.Time', function() {
  var subject;
  var app;
  var busytimeStore;
  var db;

  function logSpan(span) {
    if (Array.isArray(span)) {
      return span.forEach(logSpan);
    }

    console.log();
    console.log('START:', new Date(span.start));
    console.log('END:', new Date(span.end));
    console.log();
  }

  setup(function(done) {
    app = testSupport.calendar.app();
    subject = new Calendar.Controllers.Time(app);

    busytimeStore = app.store('Busytime');
    db = app.db;

    db.open(function() {
      done();
    });
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      app.db,
      ['events', 'busytimes', 'alarms'],
      done
    );
  });

  teardown(function() {
    app.db.close();
  });

  test('initialize', function() {
    assert.equal(subject.app, app);
    assert.instanceOf(subject, Calendar.Responder);
    assert.instanceOf(subject._collection, Calendar.IntervalTree);
    assert.ok(!subject.pending);

    assert.deepEqual(subject._timespans, []);
  });

  suite('#handleEvent', function() {

    suite('sync cache lock', function() {
      setup(function() {
        subject.observe();
        app.syncController.emit('syncStart');
      });

      test('locks after syncStart', function() {
        assert.isTrue(subject.cacheLocked);
      });

      test('unlocks after sync end', function() {
        var calledWith = false;

        subject.purgeCache = function() {
          calledWith = true;
        };

        app.syncController.emit('syncComplete');
        assert.isFalse(subject.cacheLocked);
        assert.isTrue(calledWith, 'purged');
      });
    });


    test('switching between days', function() {
      function type() {
        return subject.mostRecentDayType;
      }

      subject.selectedDay = new Date(2012, 1, 5);

      assert.deepEqual(
        subject.mostRecentDay,
        subject.selectedDay,
        'mostRecentDay - selected day'
      );

      assert.equal(
        type(),
        'selectedDay',
        '"selectedDay" change should update type'
      );

      subject.move(new Date(2012, 1, 10));

      assert.equal(
        type(), 'day',
        'move - sets most recent type'
      );

      assert.deepEqual(
        subject.mostRecentDay,
        subject.position,
        'mostRecentDay - day'
      );

      // back & forth
      subject.move(new Date(2012, 1, 15));
      assert.equal(type(), 'day');
      subject.selectedDay = new Date(2012, 1, 20);
      assert.equal(type(), 'selectedDay');
    });

  });

  test('#scale', function() {
    var calledWith;

    subject.on('scaleChange', function() {
      calledWith = arguments;
    });

    subject.scale = 'year';
    assert.deepEqual(calledWith, ['year', null]);
    calledWith = null;
    subject.scale = 'year';
    assert.isNull(calledWith, 'should not trigger change when value is same');

    subject.scale = 'day';

    assert.deepEqual(
      calledWith,
      ['day', 'year']
    );
  });

  suite('cache busytime', function() {
    var span;
    var busy;
    var event;

    setup(function() {
      span = new Calendar.Timespan(0, Infinity);
      busy = Factory('busytime');

      subject.observeTime(span, function(result) {
        event = result;
      });

      subject.cacheBusytime(busy);
    });

    test('#cacheBusytime', function() {
      assert.equal(event.type, 'add');
      assert.equal(event.data, busy);

      var query = subject.queryCache(span);
      assert.equal(query[0], busy);
    });

    test('remove', function() {
      subject.removeCachedBusytime(busy._id);

      assert.equal(event.type, 'remove');
      assert.equal(event.data, busy);

      var query = subject.queryCache(busy);
      assert.length(query, 0);
    });
  });

  suite('cache event', function() {
    var event;
    var busy;

    setup(function(done) {
      event = Factory('event');
      busy = Factory('busytime', {
        eventId: event._id
      });

      app.store('Event').persist(event, done);
      subject.cacheEvent(event);
    });

    test('#cacheEvent', function(done) {
      subject.findAssociated(busy, null, function(err, data) {
        var result = data[0];
        done(function() {
          assert.equal(result.event, event);
        });
      });
    });

    suite('#removeCachedEvent', function() {
      test('clear event', function(done) {
        subject.removeCachedEvent(event._id);
        subject.findAssociated(busy, function(err, data) {
          var result = data[0];
          done(function() {
            assert.notEqual(result.event, event);
            assert.deepEqual(result.event, event);
          });
        });
      });

      test('clear associated busytime cache', function() {
        var notAssociated = Factory('busytime', { eventId: 'notme' });
        var associated = Factory('busytime', { eventId: event._id });

        subject.cacheBusytime(associated);
        subject.cacheBusytime(notAssociated);

        subject.removeCachedEvent(event._id);
        assert.isNull(
          subject._collection.indexOf(associated),
          'associated'
        );

        assert.ok(
          subject._collection.indexOf(notAssociated) != null,
          'not associated'
        );
      });
    });
  });

  suite('#findAssociated', function() {
    // stores
    var alarmStore;
    var eventStore;

    setup(function() {
      alarmStore = app.store('Alarm');
      eventStore = app.store('Event');
    });

    // model instances
    var hasAlarm;
    var noAlarm;
    var alarm;
    var event;

    setup(function(done) {
      event = Factory('event', {
        _id: 'foobar'
      });

      hasAlarm = Factory('busytime', {
        eventId: event._id
      });

      noAlarm = Factory('busytime', {
        eventId: event._id
      });

      alarm = Factory('alarm', {
        eventId: event._id,
        busytimeId: hasAlarm._id
      });

      var trans = app.db.transaction(
        ['alarms', 'events', 'busytimes'],
        'readwrite'
      );

      trans.oncomplete = function() {
        done();
      };

      eventStore.persist(event, trans);
      busytimeStore.persist(hasAlarm, trans);
      busytimeStore.persist(noAlarm, trans);
      alarmStore.persist(alarm, trans);
    });

    test('everything is cached', function(done) {
      subject.cacheEvent(event);

      var opts = { alarms: true, event: true };

      subject.findAssociated(hasAlarm, opts, function(err, data) {
        done(function() {
          assert.ok(!err);
          assert.equal(data[0].event, event);
          assert.equal(data[0].busytime._id, alarm.busytimeId);
        });
      });
    });

    test('empty', function(done) {
      var busytime = Factory('busytime');

      subject.findAssociated(busytime, function(err, data) {
        done(function() {
          assert.ok(!err);
          assert.ok(data);
          assert.length(data, 1);

          assert.deepEqual(data[0], {
            busytime: busytime
          });
        });
      });
    });

    test('when given a busytime id (not cached)', function(done) {
      var expected = {
        busytime: hasAlarm,
        event: event
      };

      subject.findAssociated(hasAlarm._id, function(err, data) {
        done(function() {
          assert.length(data, 1, 'has data');
          var item = data[0];

          assert.equal(item.busytime._id, hasAlarm._id, 'has alarm');
          assert.equal(item.event._id, event._id, 'has event');
        });
      });
    });

    test('when given a busytime id (cached)', function(done) {
      var expected = {
        busytime: hasAlarm,
        event: event
      };

      // must be cached first
      subject.cacheBusytime(hasAlarm);

      // uses the cached busytime to find the full record
      subject.findAssociated(hasAlarm._id, function(err, data) {
        done(function() {
          var item = data[0];
          assert.deepEqual(item, expected);
        });
      });
    });

    test('default', function(done) {
      // should default to not include alarms.
      var expected = {
        busytime: hasAlarm,
        event: event
      };

      subject.findAssociated(hasAlarm, function(err, data) {
        done(function() {
          var item = data[0];
          assert.ok(!err, 'error');
          assert.ok(item, 'result');

          var eventId = item.event._id;

          assert.ok(
            subject._eventsCache[eventId],
            'caches event'
          );

          assert.deepEqual(item, expected, 'output');
        });
      });
    });

    test('no event - with missing alarm', function(done) {
      var expected = {
        busytime: noAlarm,
        alarms: []
      };

      var options = { event: false, alarms: true };

      subject.findAssociated(noAlarm, options, function(err, result) {
        done(function() {
          assert.ok(!err);
          assert.length(result, 1);
          assert.deepEqual(result[0], expected);
        });
      });
    });

    test('multiple', function(done) {
      var req = [noAlarm, hasAlarm];
      var options = {
        event: true,
        alarms: true
      };

      subject.findAssociated(req, options, function(err, data) {
        if (err) {
          done(err);
          return;
        }

        done(function() {
          // ensure that results are returned in order.
          var resultNoAlarm = data[0];
          var resultAlarm = data[1];

          var expectedNoAlarm = {
            event: event,
            busytime: noAlarm,
            alarms: []
          };

          var expectedAlarm = {
            event: event,
            busytime: hasAlarm,
            alarms: [alarm]
          };

          assert.deepEqual(
            resultNoAlarm,
            expectedNoAlarm,
            'busytime without alarm'
          );

          assert.deepEqual(
            resultAlarm.eventId,
            expectedAlarm.eventId,
            'busytime with alarm - eventId'
          );

          assert.deepEqual(
              resultAlarm.busytimeId,
              expectedAlarm.busytimeId,
              'busytime with alarm - busytimeId'
            );
        });
      });
    });

  });

  test('#moveToMostRecentDay', function() {
    var date = new Date();
    var calledMove;

    subject.move(date);

    subject.move = function() {
      Calendar.Controllers.Time.prototype.move.apply(this, arguments);
      calledMove = arguments;
    };

    subject.selectedDay = new Date(2012, 1, 1);
    subject.moveToMostRecentDay();

    assert.equal(
      calledMove[0],
      subject.selectedDay,
      'should move to selected day'
    );

    calledMove = null;

    subject.moveToMostRecentDay();
    assert.ok(!calledMove, 'should not move when "day" was last changed');
  });

  test('#selectedDay', function() {
    var calledWith;

    subject.on('selectedDayChange', function() {
      calledWith = arguments;
    });

    var date = new Date(2012, 1, 1);
    subject.selectedDay = date;

    assert.equal(calledWith[0], date);
    assert.equal(subject.selectedDay, date);

    calledWith = null;

    // try and set it again with same object...
    subject.selectedDay = new Date(2012, 1, 1);
    assert.isNull(calledWith, 'should not fire event when day is same');

    var newDate = new Date(2012, 1, 2);

    subject.selectedDay = newDate;
    assert.equal(subject.selectedDay, newDate);
    assert.equal(calledWith[0], newDate);
    assert.equal(calledWith[1], date);
  });

  suite('#purgeCache', function() {
    var spans;
    var max;
    var events;
    var toBeRemoved;
    var expected;
    var spanLength;
    var afterCallback;

    function loadSpans(start, inc, max) {
      var first = inc;
      inc = 0;
      var i = 0;
      var date;

      for (; i < max; i++) {
        inc = inc + first;
        date = new Date(
          start.getFullYear(),
          inc,
          1
        );

        subject.move(date);
      }
    }

    setup(function() {
      events = [];
      toBeRemoved = null;
      expected = null;
      afterCallback = null;

      subject.observe();
      max = subject._maxTimespans;

      var longSpan = new Calendar.Timespan(
        new Date(2010, 0, 1),
        new Date(2013, 0, 1)
      );

      subject.on(
        'purge',
        function(span) {
          events.push(span);
        }
      );

     loadSpans(
        new Date(2012, 0, 1), -1,
        max * 2
      );

      spanLength = (max * 2) + 2;
    });

    function cacheTest(desc, cb) {
      test(desc, function(done) {
        spans = subject._timespans;
        assert.length(spans, spanLength);
        // sanity check
        subject.cacheEvent(Factory('event'));
        cb();
        subject.on('loadingComplete', function() {
          // verify that we removed the last
          // three ranges furthest from the
          // current point.
          done(function() {
            assert.length(subject._timespans, max);
            assert.deepEqual(subject._eventsCache, {}, 'removes event cache');

            if (toBeRemoved) {
              assert.deepEqual(events, toBeRemoved);
            }

            if (expected) {
              assert.deepEqual(subject._timespans, expected);
            }

            if (afterCallback) {
              afterCallback();
            }
          });
        });
      });
    }

    test('when locked', function() {
      var calledWith = false;
      subject._updateBusytimeCache = function() {
        calledWith = true;
      };

      subject.cacheLocked = true;

      subject.cacheEvent(Factory('event'));
      subject.cacheBusytime(Factory('busytime'));

      subject.purgeCache();
      assert.isFalse(calledWith, 'miss - purged busytimes');
      assert.length(
        Object.keys(subject._eventsCache), 1,
        'miss - purged events'
      );

      subject.cacheLocked = false;

      subject.purgeCache();
      assert.isTrue(calledWith, 'hit - busytimes');
      assert.length(Object.keys(subject._eventsCache), 0);
    });

    cacheTest('future - previous is missing', function() {
      // XXX: this is a case where the current
      // timespan exists but the one previous
      // to is it missing. In theory this
      // should not happen.

      subject.direction = 'future';
      subject._currentTimespan = spans[0];

      expected = spans.slice(0, 6);
    });

    cacheTest('future - does not fit', function() {
      subject.direction = 'future';
      subject._currentTimespan = spans[12];

      expected = spans.slice(8, 14);
    });

    cacheTest('future - fits', function() {
      subject.direction = 'future';
      subject._currentTimespan = spans[9];

      toBeRemoved = spans.slice(0, 8);
      expected = spans.slice(8, 14);
    });


    cacheTest('past - fits', function() {
      var expectedItems = [];

      // insert items into
      // the interval tree for later
      // removal.

      subject.direction = 'past';
      subject._currentTimespan = spans[8];

      // to be removed...
      toBeRemoved = spans.slice(0, 3);
      toBeRemoved = toBeRemoved.concat(spans.slice(9));

      expected = spans.slice(3, 9);

      // overlapping
      expectedItems.push(subject._collection.add(
        Factory('busytime', {
          startDate: new Date(1991, 1, 1),
          endDate: new Date(2020, 1, 1)
        })
      ));

      // before
      subject._collection.add(Factory('busytime', {
        _startDateMS: (new Date(2000, 0, 1)).valueOf(),
        _endDateMS: expected[0].start
      }));

      // during
      expectedItems.push(subject._collection.add(
        Factory('busytime', {
          _startDateMS: expected[0].start + 1,
          _endDateMS: expected[expected.length - 1].end - 1
        })
      ));

      // after
      subject._collection.add(Factory('busytime', {
        _startDateMS: expected[expected.length - 1].end + 1,
        _endDateMS: (new Date(2020, 0, 1)).valueOf()
      }));

      afterCallback = function() {
        assert.deepEqual(
          subject._collection.items,
          expectedItems,
          'should interval tree items outside of total span'
        );
      };
    });

    cacheTest('past - does not fit', function() {
      subject.direction = 'past';
      subject._currentTimespan = spans[1];
      expected = spans.slice(0, 6);
    });

    cacheTest('past - next is missing', function() {
      subject.direction = 'past';
      subject._currentTimespan = spans[13];
      expected = spans.slice(8, 14);
    });

  });

  suite('handle busytime events', function() {
    var store;
    var collection;
    var span;
    var events;
    var inRange;
    var outOfRange;

    setup(function() {

      collection = subject._collection;
      events = {
        add: [],
        remove: []
      };

      store = app.store('Busytime');
      span = new Calendar.Timespan(
        new Date(2012, 1, 1),
        new Date(2012, 1, 5)
      );

      subject.observeTime(span, function(e) {
        events[e.type].push(e.data);
      });

      inRange = Factory('busytime', {
        startDate: new Date(2012, 1, 2),
        endDate: new Date(2012, 1, 3)
      });

      outOfRange = Factory('busytime', {
        startDate: new Date(2012, 1, 6),
        endDate: new Date(2012, 1, 8)
      });

      subject.cacheBusytime(inRange);
      subject.cacheBusytime(outOfRange);
    });

    test('add time', function() {

      assert.isNotNull(
        collection.indexOf(inRange),
        'should cache in range item'
      );

      assert.isNotNull(
        collection.indexOf(outOfRange),
        'should cache out of range item'
      );

      assert.equal(events.add.length, 1);
      assert.equal(
        events.add[0],
        inRange,
        'should emit time event'
      );
    });

    test('remove time', function() {
      // turn on event observers
      subject.observe();

      busytimeStore.emit('remove', outOfRange._id);
      busytimeStore.emit('remove', inRange._id);

      assert.isNull(
        collection.indexOf(outOfRange),
        'should remove outOfRange'
      );

      assert.isNull(
        collection.indexOf(inRange),
        'should remove inRange'
      );

      assert.length(events.remove, 1);
      assert.equal(events.remove[0], inRange);

    });

    test('#queryCache', function() {
      var span = new Calendar.Timespan(
        new Date(2000, 1, 1),
        new Date(2015, 1, 1)
      );

      var results = subject._collection.query(
        span
      );

      assert.length(results, 2);
      assert.deepEqual(
        subject.queryCache(span),
        results
      );
    });
  });

  suite('#move', function() {
    var events;
    var date;

    function clearEvents() {
      events = {
        year: [],
        month: [],
        day: []
      };
    }

    setup(function() {
      clearEvents();
      date = new Date(2012, 5, 5);

      var handle = {
        handleEvent: function(e) {
          var name = e.type.replace('Change', '');
          events[name].push(e.data[0]);
        }
      };

      subject.on('yearChange', handle);
      subject.on('monthChange', handle);
      subject.on('dayChange', handle);

      subject.move(date);
    });

    function fires(type, value) {
      var eventValue = events[type][0];

      assert.deepEqual(
        eventValue, value, 'fires: ' + type + ' change'
      );

      assert.deepEqual(
        subject[type],
        value,
        'should update .' + type
      );
    }

    function doesNotFire(type) {
      assert.deepEqual(
        events[type],
        []
      );
    }

    test('initial move', function() {
      fires('year', new Date(2012, 0, 1));
      fires('month', new Date(2012, 5, 1));
      fires('day', new Date(2012, 5, 5));

      assert.equal(subject.direction, 'future');
    });

    test('move day', function() {
      clearEvents();

      subject.move(new Date(2012, 5, 6));

      doesNotFire('year');
      doesNotFire('month');
      fires('day', new Date(2012, 5, 6));
    });

    test('move month', function() {
      clearEvents();

      subject.move(new Date(2012, 8, 6));

      doesNotFire('year');
      fires('month', new Date(2012, 8, 1));
      fires('day', new Date(2012, 8, 6));

      assert.equal(subject.direction, 'future');
    });

    test('move into the past', function() {
      clearEvents();

      subject.move(new Date(2011, 5, 4));

      fires('year', new Date(2011, 0, 1));
      fires('month', new Date(2011, 5, 1));
      fires('day', new Date(2011, 5, 4));

      assert.equal(subject.direction, 'past');
    });
  });

  suite('#_onLoadingComplete', function() {
    var past;
    var present;
    var future;

    var startDate = new Date(2012, 0, 1);

    setup(function(done) {
      subject.observe();

      var trans = busytimeStore.db.transaction(
        'busytimes',
        'readwrite'
      );

      past = Factory('busytime', {
        startDate: new Date(2011, 11, 1),
        endDate: new Date(2012, 0, 1)
      });

      present = Factory('busytime', {
        startDate: new Date(2012, 0, 1),
        endDate: new Date(2012, 1, 1)
      });

      future = Factory('busytime', {
        startDate: new Date(2012, 1, 1),
        endDate: new Date(2012, 2, 1)
      });

      trans.oncomplete = function() {
        done();
      };

      busytimeStore.persist(past, trans);
      busytimeStore.persist(present, trans);
      busytimeStore.persist(future, trans);
    });

    setup(function(done) {
      subject.on('loadingComplete', function() {
        done();
      });

      subject.move(startDate);
    });

    test('load', function() {
      var span = new Calendar.Timespan(
        0,
        Infinity
      );

      var results = subject.queryCache(span);
      assert.length(results, 3);

      // trim the private variables
      results.forEach(function(item) {
        delete item._startDateMS;
        delete item._endDateMS;
      });

      assert.deepEqual(
        results,
        [
          past,
          present,
          future
        ]
      );
    });
  });

  suite('(span loading) #_loadMonthSpan', function() {
    var stored;
    var spanOfMonth;
    var initialMove;
    var loadResults;
    var loaded;

    suiteSetup(function() {
      spanOfMonth = Calendar.Calc.spanOfMonth;
    });

    function monthSpan(date) {
      var month = new Date(
        date.getFullYear(),
        date.getMonth(),
        1
      );

      return spanOfMonth(month);
    }

    function hasSpan(store, range) {
      var i = 0;
      var len = store.length;
      var item;

      for (; i < len; i++) {
        item = store[i];
        if (item.isEqual(range)) {
          return true;
        }
      }

      return false;
    }

    setup(function(done) {
      loaded = [];

      busytimeStore.loadSpan = function(span, cb) {
        loaded.push(span);
        if (cb) {
          setTimeout(cb, 0, null, []);
        }
      };

      initialMove = new Date(2012, 1, 5);
      subject.observe();
      subject.move(initialMove);
      subject.on('loadingComplete', done);
      stored = subject._timespans;
    });

    test('initial move', function() {
      var expected = [
        monthSpan(new Date(2012, 0, 1)),
        monthSpan(new Date(2012, 1, 1)),
        monthSpan(new Date(2012, 2, 1))
      ];

      // while we expected three spans
      // have been loaded we also must
      // verify the order in which they where loaded.
      // 1. current, 2. next, 3, past
      var currentLoadSpan = expected[1];

      var futureLoadSpan = currentLoadSpan.trimOverlap(
        expected[2]
      );

      var pastLoadSpan = currentLoadSpan.trimOverlap(
        expected[0]
      );

      assert.deepEqual(subject._timespans, expected);
      assert.deepEqual(loaded, [
        currentLoadSpan,
        futureLoadSpan,
        pastLoadSpan
      ]);
    });

    var idx;
    var tries;
    var isComplete;
    var startInc;

    setup(function() {
      idx = 1;
      tries = 24;
      isComplete = false;
    });

    function loadTest(desc, inc, direction, loadRangeCb) {
      test(desc, function(done) {
        isComplete = false;
        startInc = inc;

        subject.on('loadingComplete', function() {
          if (!isComplete) {
            done(new Error('loading complete fired too early'));
          }

          done(function() {
            assert.ok(!subject.pending, 'should not be pending');
            // quick sanity check to verify we are cleaning up
            // the spans that are not used.
            assert.length(subject._timespans, subject._maxTimespans);
          });
        });

        var month;
        var nextDate;
        var currentDate;

        for (; idx < tries; idx++) {
          month = (initialMove.getMonth() + (startInc * idx));
          nextDate = new Date(2012, month + startInc, 1);
          currentDate = new Date(2012, month, 1);

          var nextSpan = spanOfMonth(nextDate);
          var currentSpan = spanOfMonth(currentDate);

          assert.ok(
            hasSpan(stored, currentSpan),
            'should have span due to preloading'
          );

          var loadRange = loadRangeCb(nextSpan);

          subject.move(currentDate);
          assert.equal(subject.direction, direction);

          assert.deepEqual(
            subject._currentTimespan,
            currentSpan
          );

          assert.ok(
            hasSpan(stored, nextSpan),
            'should record new range'
          );

          assert.ok(
            hasSpan(loaded, loadRange),
            'should request trimmed load range'
          );
          assert.ok(subject.pending, 'should trigger load');
        }
        isComplete = true;
      });
    }

    loadTest('into the past', -1, 'past', function(nextSpan) {
      return stored[0].trimOverlap(nextSpan);
    });

    loadTest('into the future', 1, 'future', function(nextSpan) {
      return stored[stored.length - 1].trimOverlap(nextSpan);
    });

    test('jump', function(done) {
      // reset timespans
      subject._timespans.length = 0;

      function month(year, month) {
        return spanOfMonth(new Date(year, month));
      }

      subject.on('loadingComplete', function() {
        done(function() {
          var expected = [
            month(2010, 11),
            month(2011, 0),
            month(2011, 1),

            month(2011, 11),
            month(2012, 0),
            month(2012, 1)
          ];

          assert.length(subject._timespans, 6);
          assert.deepEqual(subject._timespans, expected);
        });
      });

      subject.move(new Date(2011, 0, 1));
      subject.move(new Date(2012, 0, 1));
    });

  });

});
