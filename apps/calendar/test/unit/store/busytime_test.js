requireApp('calendar/test/unit/helper.js', function() {
  requireLib('responder.js');
  requireLib('interval_tree.js');
  requireLib('timespan.js');
  requireLib('store/event.js');
  requireLib('store/busytime.js');
});

suite('store/busytime', function() {

  var subject;
  var db;
  var id = 0;

  function event(start, end) {
    var remote = {};

    if (start)
      remote.startDate = start;

    if (end)
      remote.endDate = end;

    remote.id = ++id;

    return Factory('event', {
      remote: remote
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

  function inTree() {
    var item = record.apply(this, arguments);
    var id = item._id;
    var list = subject._byEventId[item.eventId];

    var result = false;

    list.forEach(function(cur) {
      if (cur._id == id) {
        result = cur;
      }
    });

    if (result) {
      return subject._tree.indexOf(result) !== null;
    }
    return false;
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

  test('initialize', function() {
    assert.instanceOf(subject._tree, Calendar.IntervalTree);
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

  suite('#loadSpan', function() {
    var list;
    var span;

    setup(function() {
      list = Object.create(null);
      span = new Calendar.Timespan(
        new Date(2012, 1, 5),
        new Date(2012, 1, 10)
      );
    });

    function add(name, start, end) {
      setup(function(done) {
        var store = subject.db.getStore('Event');
        var item = list[name] = event(start, end);
        store.persist(item, done);
      });
    }

    add('before long', new Date(2011, 1, 1), new Date(2011, 3, 1));
    add('overlap', new Date(2012, 1, 1), new Date(2013, 1, 1));
    add('starts before', new Date(2012, 1, 3), new Date(2012, 1, 6));
    add('during', new Date(2012, 1, 5), new Date(2012, 1, 9));
    add('ends after', new Date(2012, 1, 9), new Date(2012, 1, 11));
    add('after', new Date(2012, 1, 12), new Date(2012, 1, 15));

    var eventFired;
    var results;
    var expectedEventIds;

    function expected(name) {
      expectedEventIds.push(
        list[name]._id
      );
    }

    setup(function(done) {
      eventFired = [];

      // because we just added events
      // we need to remove them from the cache
      subject._setupCache();

      // add listener for event
      subject.observeTime(span, function(event) {
        eventFired.push(event);
      });

      // build the list of expected
      // busytimes to be returned by their
      // event id
      expectedEventIds = [];

      // order is important we expect them
      // to be sorted by start date
      expected('overlap');
      expected('starts before');
      expected('during');
      expected('ends after');

      // load
      subject.loadSpan(span, function(err, data) {
        if (err) {
          return done(err);
        }
        results = data;

        // wait until next tick for event
        // to fire...
        setTimeout(done, 0, null);
      });
    });

    test('load results', function() {
      // verify correct data is returned;
      var idMap = Object.create(null);

      results.forEach(function(item) {
        var id = item.eventId;
        if (!(id in idMap)) {
          idMap[id] = true;
        }
      });

      var actualIds = Object.keys(idMap);

      assert.deepEqual(
        actualIds,
        expectedEventIds,
        'load event ids'
      );

      // verify cache
      assert.deepEqual(
        subject._tree.items,
        results,
        'should add results to cache'
      );

      var firstEvent = eventFired[0];

      assert.equal(firstEvent.type, 'load');
      assert.deepEqual(
        firstEvent.data,
        results,
        'should fire load event'
      );
    });

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
      subject._setupCache();

      subject.load(function(err, results) {
        done(function() {
          results = subject._tree.items;
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
      // just load everything...
      var span = new Calendar.Timespan(
        new Date(2012, 1, 1),
        new Date(2015, 1, 1)
      );

      // quick sanity check to make sure
      // we removed in memory stuff
      assert.equal(subject._tree.items.length, 1);
      assert.equal(subject._tree.items[0].eventId, keepModel._id);

      subject._setupCache();
      subject.loadSpan(span, function(err, results) {
        done(function() {
          assert.equal(results.length, 1);
          var result = results[0];
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


    test('#_addEventTimes', function() {

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

      var byEventId = {};

      byEventId[recurring._id] = [
        record(recurring),
        record(recurring, 1)
      ];

      byEventId[single._id] = [
        record(single)
      ];

      assert.deepEqual(
        subject._byEventId,
        byEventId
      );

      assert.isTrue(inTree(single));
      assert.isTrue(inTree(recurring));
      assert.isTrue(inTree(recurring, 1));
    });

    suite('#_removeEventTimes', function() {

      test('remove single', function() {
        var item = subject._byEventId[single._id][0];

        subject._removeEventTimes(single._id);

        assert.equal(events.remove.length, 1);

        assert.deepEqual(
          events.remove[0].data,
          record(single)
        );


        assert.ok(
          subject._byEventId[recurring._id]
        );

        assert.ok(
          !subject._byEventId[single._id]
        );

        assert.isTrue(
          subject._tree.indexOf(item) === null
        );
      });

      test('remove recurring', function() {
        var removedItems = subject._byEventId[recurring._id];

        subject._removeEventTimes(recurring._id);
        assert.equal(events.remove.length, 2);

        assert.ok(
          !subject._byEventId[recurring._id]
        );

        assert.ok(
          subject._byEventId[single._id]
        );

        assert.isTrue(
          subject._tree.indexOf(removedItems[0]) === null
        );

        assert.isTrue(
          subject._tree.indexOf(removedItems[1]) === null
        );

      });

    });
  });

  suite('#eventsInCachedSpan', function() {

    var eventStore;
    var events = {};

    setup(function() {
      eventStore = subject.db.getStore('Event');

      events.oneIn = Factory('event', {
        remote: {
          endDate: new Date(2012, 1, 10),
          // end date is the same for all occurrences.
          occurs: [
            new Date(2012, 1, 1)
          ]
        }
      });

      events.twoIn = Factory('event', {
        remote: {
          endDate: new Date(2012, 1, 9),
          occurs: [
            new Date(2012, 1, 7)
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
          assert.equal(list.length, 2);

          hasEvent(0, 'oneIn', 0, 'first date in range');
          hasEvent(1, 'twoIn', 0, 'second date in range');
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

    function add(start, end) {
      setup(function(done) {
        var item = event(start);
        item.remote.startDate = start;
        item.remote.endDate = end;

        list[start.valueOf()] = subject._eventToRecord(
          start, item
        );

        var store = subject.db.getStore('Event');
        store.persist(item, done);
      });
    }

    function d(day) {
      return new Date(2012, 1, day);
    }

    add(d(5), d(7));
    add(d(10), d(12));
    add(d(14), d(16));
    add(d(16), d(18));
    add(d(20), d(22));

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

    test('one match - top', function() {
      var range = new Calendar.Timespan(
        new Date(2011, 1, 1),
        d(6)
      );

      var result = subject.busytimesInCachedSpan(range);
      assert.equal(result.length, 1);

      assert.equal(
        result[0].eventId,
        atTime(d(5)).eventId
      );

    });


    test('one match - bottom', function() {
      var range = new Calendar.Timespan(
        d(21),
        new Date(2013, 1, 10)
      );

      var result = subject.busytimesInCachedSpan(range);
      assert.equal(result.length, 1);

      assert.equal(
        result[0].eventId,
        atTime(d(20)).eventId
      );

    });

    test('middle slice', function() {
      var range = new Calendar.Timespan(
        d(11), d(15)
      );

      var result = subject.busytimesInCachedSpan(range);
      assert.equal(result.length, 2);

      assert.equal(
        result[0].eventId,
        atTime(d(10)).eventId
      );

      assert.equal(
        result[1].eventId,
        atTime(d(14)).eventId
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

    assert.equal(result.start, result.startDate.valueOf());

    assert.equal(
      result.endDate,
      item.remote.endDate
    );

    assert.equal(result.end, result.endDate.valueOf());

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
      assert.equal(Object.keys(subject._byEventId).length, 3);
    });

  });

});
