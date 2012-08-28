requireApp('calendar/test/unit/helper.js', function() {
  requireLib('timespan.js');
  requireLib('interval_tree.js');
});

window.page = window.page || {};

suite('controller', function() {
  var subject;
  var app;
  var busytime;
  var loaded;

  function logSpan(span) {
    if (Array.isArray(span)) {
      return span.forEach(logSpan);
    }

    console.log();
    console.log('START:', new Date(span.start));
    console.log('END:', new Date(span.end));
    console.log();
  }

  setup(function() {
    loaded = [];
    app = testSupport.calendar.app();
    subject = new Calendar.Controllers.Time(app);

    busytime = app.store('Busytime');
    busytime.loadSpan = function(span, cb) {
      loaded.push(span);
      if (typeof(cb) !== 'undefined') {
        setTimeout(cb, 0);
      }
    };
  });

  test('initialize', function() {
    assert.equal(subject.app, app);
    assert.instanceOf(subject, Calendar.Responder);
    assert.instanceOf(subject._collection, Calendar.IntervalTree);
    assert.isFalse(subject.loading);
    assert.equal(subject.pending, 0);

    assert.deepEqual(subject._timespans, []);
  });

  suite('#fitRange', function() {
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

  suite('#_checkCache', function() {
    var spans;
    var max;
    var events;

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
      // turn on observers
      subject.observe();
      max = subject._maxTimespans;
    });

    test('going back', function(done) {
      events = [];
      // overlap whole time
      var observeTime = new Calendar.Timespan(
        new Date(2010, 11, 1),
        new Date(2012, 11, 1)
      );

      subject.observeTime(
        observeTime,
        function(event) {
          if (event.type === 'purge') {
            events.push(event.data);
          }
        }
      );

      loadSpans(
        new Date(2012, 0, 1), -1,
        max + 3
      );

      spans = subject._timespans;
      assert.length(spans, max + 5);

      var expected = spans.slice(6, 11);
      subject.on('loadingComplete', function() {
        // verify that we removed the last
        // three ranges furthest from the
        // current point.
        done(function() {
          assert.length(subject._timespans, max);
          assert.deepEqual(events, expected);
        });
      });

    });

    test('going forward', function(done) {
      events = [];
      // overlap whole time
      var observeTime = new Calendar.Timespan(
        new Date(2011, 11, 1),
        new Date(2013, 11, 1)
      );

      subject.observeTime(
        observeTime,
        function(event) {
          if (event.type === 'purge') {
            events.push(event.data);
          }
        }
      );

      loadSpans(
        new Date(2012, 0, 1), 1,
        max + 3
      );

      spans = subject._timespans;
      assert.length(spans, max + 5);

      var expected = spans.slice(0, 5);

      subject.on('loadingComplete', function() {
        // verify that we removed the last
        // three ranges furthest from the
        // current point.
        done(function() {
          assert.length(subject._timespans, max);
          assert.deepEqual(events, expected);
        });
      });

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

      store.emit('add time', inRange);
      store.emit('add time', outOfRange);
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
      store.emit('remove time', inRange);
      store.emit('remove time', outOfRange);

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

  suite('#_loadMonthSpan', function() {

    var stored;
    var spanOfMonth;
    var initialMove;

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

    test('go backwards', function(done) {

      var tries = 24;
      var idx = 1;
      var isComplete = false;
      var startInc = -1;

      subject.on('loadingComplete', function() {
        if (!isComplete) {
          done(new Error('loading complete fired too early'));
        }

        done(function() {
          assert.isFalse(subject.loading);
        });
      });

      for (; idx < tries; idx++) {
        var month = (initialMove.getMonth() + (startInc * idx));

        var newDate = new Date(2012, month - 1, 1);
        var currentDate = new Date(2012, month, 1);

        var newSpan = spanOfMonth(newDate);
        var currentSpan = spanOfMonth(currentDate);

        assert.ok(
          hasSpan(stored, currentSpan),
          'should have span due to preloading'
        );

        var loadRange = stored[0].trimOverlap(
          newSpan
        );

        subject.move(currentDate);
        assert.equal(subject.direction, 'past');

        assert.isTrue(subject.loading, 'should trigger load');

        assert.deepEqual(
          subject._currentTimespan,
          currentSpan
        );

        assert.ok(
          hasSpan(stored, newSpan),
          'should record new range'
        );

        var lastLoad = loaded[loaded.length - 1];

        assert.ok(
          hasSpan(loaded, loadRange),
          'should request trimmed load range'
        );
      }

      isComplete = true;
    });

    test('go forward', function(done) {

      var tries = 24;
      var idx = 1;
      var isComplete = false;
      var startInc = 1;

      subject.on('loadingComplete', function() {
        if (!isComplete) {
          done(new Error('loading complete fired too early'));
        }

        done(function() {
          assert.isFalse(subject.loading);
        });
      });

      for (; idx < tries; idx++) {
        var month = (initialMove.getMonth() + (startInc * idx));

        var newDate = new Date(2012, month + 1, 1);
        var currentDate = new Date(2012, month, 1);

        var newSpan = spanOfMonth(newDate);
        var currentSpan = spanOfMonth(currentDate);

        assert.ok(
          hasSpan(stored, currentSpan),
          'should have span due to preloading'
        );

        var loadRange = stored[stored.length - 1].trimOverlap(
          newSpan
        );


        subject.move(currentDate);
        assert.equal(subject.direction, 'future');
        assert.isTrue(subject.loading, 'should trigger load');

        assert.deepEqual(
          subject._currentTimespan,
          currentSpan
        );

        assert.ok(
          hasSpan(stored, newSpan),
          'should record new range'
        );

        assert.ok(
          hasSpan(loaded, loadRange),
          'should request trimmed load range'
        );
      }

      isComplete = true;
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
