requireApp('calendar/test/unit/helper.js', function() {
  requireLib('responder.js');

  requireLib('timespan.js');
  requireLib('store/event.js');
  requireLib('store/busytime.js');

});

suite('store/busytime', function() {

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
    testSupport.calendar.clearStore(
      subject.db,
      done
    );
  });

  teardown(function() {
    subject.db.close();
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
      assert.equal(subject._times.length, 1);
      assert.equal(subject._times[0], time(keepModel));

      subject._cached = Object.create(null);
      subject.load(function(err, results) {
        done(function() {
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

  suite('#eventsInCachedSpan', function() {

    var eventStore;
    var events = {};

    setup(function() {
      // two events in three instances
      // we only want two back
      eventStore = subject.db.getStore('Event');

      events.oneIn = Factory('event', {
        remote: {
          endDate: new Date(2012, 1, 10),
          occurs: [
            new Date(2012, 1, 1),
            new Date(2012, 1, 5)
          ]
        }
      });

      events.twoIn = Factory('event', {
        remote: {
          endDate: new Date(2012, 1, 9),
          occurs: [
            new Date(2012, 1, 7),
            new Date(2012, 1, 8)
          ]
        }
      });
    });

    setup(function(done) {
      eventStore.persist(events.oneIn, done);
    });

    setup(function(done) {
      eventStore.persist(events.twoIn, done);
    });

    test('result', function(done) {
      // sanity check
      assert.equal(subject._times.length, 4);

      var span = new Calendar.Timespan(
        new Date(2012, 1, 5),
        new Date(2012, 1, 11)
      );


      subject.eventsInCachedSpan(span, function(err, list) {

        function hasEvent(idx, event, occuranceIdx, msg) {
          assert.deepEqual(
            list[idx][0].startDate,
            events[event].remote.occurs[occuranceIdx],
            idx + ' - ' + event + ': ' + msg
          );

          assert.deepEqual(
            list[idx][1],
            events[event],
            idx + ' - ' + event + ': ' + msg
          );
        }

        done(function() {
          assert.equal(list.length, 3);

          hasEvent(0, 'oneIn', 1, 'first date in range');
          hasEvent(1, 'twoIn', 0, 'second date in range');
          hasEvent(2, 'twoIn', 1, 'third date in range');
        });
      });
    });

  });

  suite('#busytimesInCachedSpan', function() {
    var list;

    setup(function() {
      list = {};
    });

    function atTime(date) {
      return list[date.valueOf()];
    }

    function add(time) {
      setup(function(done) {
        var item = event(time);

        list[time.valueOf()] = subject._eventToRecord(
          time, item
        );

        var store = subject.db.getStore('Event');
        store.persist(item, done);
      });
    }

    add(new Date(2012, 1, 1));
    add(new Date(2012, 1, 2));
    add(new Date(2012, 1, 3));
    add(new Date(2012, 1, 4));
    add(new Date(2012, 1, 5));

    test('no matches start', function() {
      var range = new Calendar.Timespan(
        new Date(2011, 1, 5),
        new Date(2011, 12, 10)
      );

      var result = subject.busytimesInCachedSpan(range);
      assert.equal(result.length, 0);
    });


    test('no matches end', function() {
      var range = new Calendar.Timespan(
        new Date(2013, 1, 5),
        new Date(2015, 1, 10)
      );

      var result = subject.busytimesInCachedSpan(range);
      assert.equal(result.length, 0);
    });

    test('one match - end', function() {
      var range = new Calendar.Timespan(
        new Date(2011, 1, 1),
        new Date(2012, 1, 1)
      );

      var result = subject.busytimesInCachedSpan(range);
      assert.equal(result.length, 1);

      assert.equal(
        result[0].eventId,
        atTime(new Date(2012, 1, 1)).eventId
      );

    });


    test('one match - start', function() {
      var range = new Calendar.Timespan(
        new Date(2012, 1, 5),
        new Date(2013, 1, 10)
      );

      var result = subject.busytimesInCachedSpan(range);
      assert.equal(result.length, 1);

      assert.equal(
        result[0].eventId,
        atTime(new Date(2012, 1, 5)).eventId
      );

    });

    test('middle slice', function() {
      var range = new Calendar.Timespan(
        new Date(2012, 1, 2),
        new Date(2012, 1, 4)
      );

      var result = subject.busytimesInCachedSpan(range);
      assert.equal(result.length, 3);

      assert.equal(
        result[0].eventId,
        atTime(new Date(2012, 1, 2)).eventId
      );

      assert.equal(
        result[1].eventId,
        atTime(new Date(2012, 1, 3)).eventId
      );

      assert.equal(
        result[2].eventId,
        atTime(new Date(2012, 1, 4)).eventId
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
      result.startDate,
      item.remote.occurs[0]
    );

    assert.equal(
      result.endDate,
      item.remote.endDate
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

  suite('#load', function() {
    function add(date) {
      setup(function(done) {
        var item = Factory('event', {
          remote: { startDate: date }
        });

        var store = subject.db.getStore('Event');
        store.persist(item, done);
      });
    }

    add(new Date(2012, 1, 1));
    add(new Date(2012, 1, 5));
    add(new Date(2012, 1, 10));

    setup(function(done) {
      subject._setupCache();
      subject.load(done);
    });

    test('load cache', function() {
      assert.equal(subject._times.length, 3);
    });

  });

});
