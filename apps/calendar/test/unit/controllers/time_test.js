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

  setup(function() {
    loaded = [];
    app = testSupport.calendar.app();
    subject = new Calendar.Controllers.Time(app);

    busytime = app.store('Busytime');
    busytime.loadSpan = function(span) {
      loaded.push(span);
    };
  });

  test('initialize', function() {
    assert.equal(subject.app, app);
    assert.instanceOf(subject, Calendar.Responder);
    assert.instanceOf(subject._collection, Calendar.IntervalTree);
    assert.deepEqual(subject._timespans, []);
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

    function hasRange(store, range) {
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

    setup(function() {
      subject.observe();
      stored = subject._timespans;
      subject.move(new Date(2012, 1, 5));
    });

    test('go backwards', function() {
      var tries = 24;
      var idx = 0;

      for (; idx < tries; idx++) {
        var month = idx - (idx * 2);
        var date = new Date(2012, month, 6);

        var range = Calendar.Calc.spanOfMonth(date);
        var loadRange = stored[0].trimOverlap(
          range
        );

        subject.move(date);

        assert.deepEqual(
          subject._lastTimespan,
          range
        );

        assert.ok(
          hasRange(stored, range),
          'should record new range'
        );

        assert.ok(
          hasRange(loaded, loadRange),
          'should request trimmed load range'
        );
      }
    });

    test('going forward', function() {
      var tries = 24;
      var idx = 0;

      for (; idx < tries; idx++) {
        var date = new Date(2012, 2 + idx, 1);
        var range = Calendar.Calc.spanOfMonth(date);
        var loadRange = stored[idx].trimOverlap(
          range
        );

        subject.move(date);

        assert.deepEqual(
          subject._lastTimespan,
          range
        );

        assert.ok(
          hasRange(stored, range),
          'should record new range'
        );

        assert.ok(
          hasRange(loaded, loadRange),
          'should request trimmed load range'
        );
      }
    });

    test('initial month load', function() {
      // load events for jan 2012
      var range = Calendar.Calc.spanOfMonth(
        new Date(2012, 1, 1)
      );

      assert.ok(
        hasRange(stored, range),
        'should record range in controller'
      );

      assert.ok(
        hasRange(loaded, range),
        'should request load of range'
      );
    });

  });

});
