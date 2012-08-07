requireApp('calendar/test/unit/helper.js', function() {
  requireLib('responder.js');

  requireLib('timespan.js');
  requireLib('store/event.js');
  requireLib('store/busytime.js');

});

suite('store/busytime', function() {

  suite('#binsearchForInsert', function() {
    var fn;

    suiteSetup(function() {
      fn = Calendar.Store.Busytime.bsearchForInsert;
    });

    function compare(a, b) {
      if (a === b)
        return 0;

      if (a < b) {
        return -1;
      } else {
        return 1;
      }
    }

    test('0', function() {
      assert.equal(
        fn([], 1, compare),
        0
      );
    });

    test('8', function() {
      var list = [1, 3, 7, 9, 10];
      var result = fn(list, 4, compare);

      assert.equal(result, 2);

      list.splice(result, 0, 4);
    });

    test('array inner search', function() {
      var list = [
        [1, null],
        [2, null],
        [4, null]
      ];

      var result = fn(list, 3, function(seek, inList) {
        var target = inList[0];

        if (seek === target)
          return 0;

        if (seek < target) {
          return -1;
        }

        return 1;
      });
      assert.equal(result, 2);
    });

  });
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

  function occurance(event, idx) {
    if (typeof(idx) === 'undefined') {
      idx = 0;
    }

    return event.remote.occurs[idx];
  }

  function record(event, idx) {
    return subject._eventToRecord(
      occurance(event, idx),
      event
    );
  }

  setup(function(done) {
    this.timeout(5000);
    id = 0;
    db = testSupport.calendar.db();
    subject = db.getStore('Busytime');

    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  teardown(function(done) {
    var trans = db.transaction('busytimes', 'readwrite');
    var accounts = trans.objectStore('busytimes');
    var res = accounts.clear();

    res.onerror = function() {
      done(new Error('could not wipe busytimes db'));
    }

    res.onsuccess = function() {
      done();
    }
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

  suite('#addEvent', function(done) {
    var eventModel;
    var expected;

    setup(function() {
      eventModel = event(new Date(2012, 1, 1));
      expected = [];

      eventModel.remote.occurs.push(
        new Date(2012, 1, 2)
      );

      expected.push(
        record(eventModel),
        record(eventModel, 1)
      );

      subject.addEvent(eventModel, done);
    });

    test('result', function(done) {
      subject._cached = Object.create(null);

      subject.load(function(err, results) {
        done(function() {
          results = Object.keys(results).map(function(key) {
            delete results[key]._id;
            return results[key];
          });
          assert.deepEqual(results, expected);
        });
      });
    });
  });

  suite('#removeEvent', function() {
    var removeModel;
    var keepModel;

    setup(function() {
      removeModel = event(new Date(2012, 1, 1));
      removeModel.remote.occurs.push(
        new Date(2012, 1, 2)
      );

      keepModel = event(new Date(2013, 1, 1));
    });

    setup(function(done) {
      subject.addEvent(keepModel, done);
    });

    setup(function(done) {
      subject.addEvent(removeModel, done);
    });

    setup(function(done) {
      subject.removeEvent(removeModel._id, done);
    });

    test('removal', function(done) {
      // quick sanity check to make sure
      // we removed in memory stuff
      console.log(subject._times.length);
      assert.equal(subject._times.length, 1);
      assert.equal(subject._times[0], time(keepModel));

      subject._cached = Object.create(null);
      subject.load(function(err, results) {
        done(function() {
          //console.log(results);
          var keys = Object.keys(results);
          assert.equal(keys.length, 1);
          var result = results[keys[0]];
          assert.equal(result.eventId, keepModel._id);
        });
      });
    });

  });

  suite('memory caching ops', function() {
    var single;
    var recurring;
    var events = {};

    setup(function() {
      events = { remove: [], add: [] };
      var span = new Calendar.Timespan(
        new Date(2010, 1, 1),
        new Date(2015, 1, 1)
      );

      subject.observeTime(span, function(e) {
        events[e.type].push(e);
      });

      single = event(new Date(2012, 1, 1));
      recurring = event(new Date(2011, 12, 3));
      recurring.remote.occurs.push(
        new Date(2012, 2, 1)
      );

      subject._addEventTimes(single);
      subject._addEventTimes(recurring);
    });

    suite('#_removeEventTimes', function() {

      test('remove single', function() {
        subject._removeEventTimes(single._id);

        assert.equal(events.remove.length, 1);

        assert.deepEqual(
          events.remove[0].data,
          record(single)
        );

        assert.deepEqual(
          subject._times,
          [time(recurring), time(recurring, 1)]
        );

        assert.ok(
          subject._eventTimes[recurring._id]
        );

        assert.ok(
          !subject._eventTimes[single._id]
        );


        var cached = {};
        cached[time(recurring)] = [
          record(recurring)
        ];

        cached[time(recurring, 1)] = [
          record(recurring, 1)
        ];

        assert.deepEqual(
          subject._timeRecords,
          cached
        );
      });

      test('remove recurring', function() {
        subject._removeEventTimes(recurring._id);
        assert.equal(events.remove.length, 2);

        assert.deepEqual(
          subject._times,
          [time(single)]
        );

        assert.ok(
          !subject._eventTimes[recurring._id]
        );

        assert.ok(
          subject._eventTimes[single._id]
        );

        var cached = {};
        cached[time(single)] = [record(single)];

        assert.deepEqual(
          subject._timeRecords,
          cached
        );
      });

    });

    test('#_addEventTimes', function() {

      assert.deepEqual(
        subject._times,
        [
          time(recurring),
          time(single),
          time(recurring, 1)
        ]
      );

      assert.equal(events.add.length, 3);

      assert.deepEqual(
        events.add[0].data,
        record(single)
      );

      assert.deepEqual(
        events.add[1].data,
        record(recurring)
      );

      assert.deepEqual(
        events.add[2].data,
        record(recurring, 1)
      );

      var eventTimes = {};

      eventTimes[recurring._id] = [
        time(recurring),
        time(recurring, 1)
      ];

      eventTimes[single._id] = [
        time(single)
      ];

      assert.deepEqual(
        subject._eventTimes,
        eventTimes
      );

      var cached = {};

      cached[time(single)] = [
        record(single)
      ];

      cached[time(recurring)] = [
        record(recurring)
      ];

      cached[time(recurring, 1)] = [
        record(recurring, 1)
      ];

      assert.deepEqual(
        subject._timeRecords,
        cached
      );
    });

  });

  test('#_eventToRecord', function() {
    var item = event(new Date(2012, 1, 1));
    var result = subject._eventToRecord(
      item.remote.occurs[0],
      item
    );

    assert.equal(
      result.time,
      item.remote.occurs[0]
    );

    assert.equal(
      result.eventId,
      item._id
    );

    assert.equal(
      result.calendarId,
      item.calendarId
    );
  });

});
