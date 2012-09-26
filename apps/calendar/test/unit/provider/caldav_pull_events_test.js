requireApp('calendar/test/unit/helper.js', function() {
  requireApp('calendar/test/unit/provider/mock_stream.js');
  requireApp('calendar/test/unit/service/helper.js');
  requireLib('ext/ical.js');
  requireLib('ext/caldav.js');
  requireLib('service/caldav.js');
  requireLib('provider/caldav_pull_events.js');
  requireLib('models/account.js');
  requireLib('models/calendar.js');
});

suite('provider/caldav_pull_events', function() {

  var fixtures;
  var ical;
  var subject;
  var stream;
  var db;
  var app;
  var service;

  function createSubject(options) {
    if (typeof(options) === 'undefined') {
      options = Object.create(null);
    }

    if (!options.calendar) {
      options.calendar = calendar;
    }

    if (!options.account) {
      options.account = account;
    }

    if (!options.cached) {
      options.cached = Object.create(null);
    }

    stream = new Calendar.Responder();

    options.app = app;

    return new Calendar.Provider.CaldavPullEvents(
      stream,
      options
    );
  }

  suiteSetup(function(done) {
    this.timeout(10000);
    ical = new ServiceSupport.Fixtures('ical');
    ical.load('single_event');
    ical.load('recurring_event');
    ical.onready = done;
    fixtures = {};
    service = new Calendar.Service.Caldav(
      new Calendar.Responder()
    );
  });

  ['singleEvent', 'recurringEvent'].forEach(function(item) {
    setup(function(done) {
      service.parseEvent(ical[item], function(err, event) {
        fixtures[item] = service._formatEvent('abc', '/foobar.ics', event);
        done();
      });
    });
  });

  function serviceEvent(type) {
    // poor mans clone
    var json = JSON.stringify(
      fixtures[type]
    );

    return JSON.parse(json);
  }

  setup(function(done) {
    this.timeout(5000);
    app = testSupport.calendar.app();
    db = app.db;

    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  var account;

  setup(function(done) {
    account = Factory.create('account');
    app.store('Account').persist(account, done);
  });

  var calendar;

  setup(function(done) {
    calendar = Factory.create('calendar');
    calendar.accountId = account._id;
    calendar.remote.syncToken = 'not-same-as-other';
    calendar.syncToken = 'neq';
    app.store('Calendar').persist(calendar, done);
  });

  setup(function() {
    subject = createSubject();
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      db,
      ['accounts', 'calendars', 'events', 'busytimes'],
      done
    );
  });

  test('initializer', function() {
    var subject = createSubject();

    assert.instanceOf(subject.calendar, Calendar.Models.Calendar, '.calendar');
    assert.instanceOf(subject.account, Calendar.Models.Account, '.account');
    assert.equal(subject.app, app);

    assert.instanceOf(
      subject.syncStart,
      Date
    );
  });

  suite('#eventIdFromRemote', function() {

    test('exception', function() {
      var event = serviceEvent('singleEvent');
      event.recurrenceId = { utc: 100 };

      var id = calendar._id + '-' + event.id + '-100';

      assert.deepEqual(
        subject.eventIdFromRemote(event),
        id
      );
    });

    test('non exception', function() {
      var event = serviceEvent('singleEvent');
      var id = calendar._id + '-' + event.id;
      assert.deepEqual(
        subject.eventIdFromRemote(event),
        id
      );
    });

  });

  test('#busytimeIdFromRemote', function() {
    var busytime = {
      eventId: 'foo',
      start: { utc: 100 },
      end: { utc: 200 }
    };

    var id = '100-200-' + subject.eventIdFromRemote(
      busytime
    );

    assert.deepEqual(
      subject.busytimeIdFromRemote(busytime),
      id
    );
  });

  suite('#formatEvent', function() {

    test('recurring event', function() {
      var event = serviceEvent('recurringEvent');
      var exceptions = event.exceptions;

      delete event.exceptions;

      var primary = subject.formatEvent(
        event
      );

      var exception = subject.formatEvent(
        exceptions[0]
      );

      assert.ok(exception.remote, 'has remote');

      assert.deepEqual(
        exception.parentId,
        primary._id,
        'has parent id'
      );

      assert.equal(
        exception._id,
        primary._id + '-' + exception.remote.recurrenceId.utc,
        'has exception id'
      );
    });

    test('single event', function() {
      var event = serviceEvent('singleEvent');
      var result = subject.formatEvent(event);

      var remote = serviceEvent('singleEvent');

      delete event.exceptions;
      delete remote.exceptions;

      var expected = {
        _id: subject.eventIdFromRemote(remote),
        calendarId: calendar._id,
        remote: remote
      };

      assert.deepEqual(
        subject.formatEvent(event),
        expected
      );
    });
  });

  suite('#formatBusytime', function() {
    var times = [];
    var event;

    setup(function(done) {
      event = serviceEvent('recurringEvent');
      var stream = new Calendar.Responder();

      stream.on('occurrence', function(item) {
        times.push(item);
      });

      service.expandRecurringEvent(
        event.icalComponent,
        { limit: 5 },
        stream,
        function() {
          done();
        }
      );
    });

    test('non-exception busytime', function() {
      var time = times[1];
      assert.isFalse(time.isException, 'is exception');

      var eventId = subject.eventIdFromRemote(time, true);
      var result = subject.formatBusytime(time);
      assert.equal(result.eventId, eventId);
    });

    test('exception busytime', function() {
      var time = times[2];
      assert.isTrue(time.isException, 'is exception');

      var eventId = subject.eventIdFromRemote(
        time
      );

      var id = subject.busytimeIdFromRemote(
        time
      );

      var result = subject.formatBusytime(time);

      assert.equal(result.calendarId, calendar._id);

      assert.equal(
        result._id,
        id,
        '_id'
      );

      assert.include(result.eventId, times[2].recurrenceId.utc, 'has utc time');
      assert.equal(result.eventId, eventId);
    });
  });

  suite('#commit', function() {
    var removed = [];
    var eventStore;
    var newEvent;
    var newBusytime;

    setup(function(done) {
      removed.length = 0;
      eventStore = app.store('Event');
      eventStore.remove = function(id) {
        removed.push(id);
      }

      newEvent = serviceEvent('singleEvent');
      newEvent = subject.formatEvent(newEvent);

      subject.eventQueue.push(newEvent);
      subject.removeList.push('1');

      newBusytime = Factory('busytime', {
        eventId: newEvent._id,
        calendarId: newEvent.calendarId
      });

      subject.busytimeQueue.push(newBusytime);

      subject.commit(function() {
        setTimeout(function() {
          done();
        }, 0);
      });
    });

    test('busytimes', function(done) {
      var id = newBusytime._id;

      var trans = db.transaction('busytimes');
      var store = trans.objectStore('busytimes');

      store.get(id).onsuccess = function(e) {
        done(function() {
          var result = e.target.result;
          assert.ok(result);

          assert.hasProperties(result, {
            start: newBusytime.start,
            end: newBusytime.end,
            eventId: newBusytime.eventId,
            calendarId: newBusytime.calendarId
          });
        });
      };
    });

    test('tokens', function() {
      var expectedToken = calendar.remote.syncToken;
      var expectedDate = subject.syncStart;

      assert.deepEqual(removed, ['1'], 'removed');

      assert.deepEqual(
        calendar.lastEventSyncToken,
        expectedToken,
        'sync token'
      );

      assert.deepEqual(
        calendar.lastEventSyncDate,
        expectedDate,
        'calendar sync date'
      );
    });

    test('events', function(done) {
      eventStore._cached = Object.create(null);
      eventStore.findByIds([newEvent._id], function(err, list) {
        done(function() {
          assert.length(Object.keys(list), 1, 'saved events');
          assert.ok(list[newEvent._id], 'saved event id');
        });
      });
    });

  });

  suite('#handleOccurrenceSync', function() {
    var addedTimes = [];
    var times = [];
    var event;

    setup(function(done) {
      event = serviceEvent('recurringEvent');
      addedTimes.length = 0;

      var store = app.store('Busytime');

      store.addTime = function(given) {
        addedTimes.push(given);
      };

      var stream = new Calendar.Responder();

      stream.on('occurrence', function(item) {
        times.push(item);
      });

      service.expandRecurringEvent(
        event.icalComponent,
        { limit: 10 },
        stream,
        function() {
          done();
        }
      );
    });

    function copy(idx) {
      var json = JSON.stringify(times[idx]);
      return JSON.parse(json);
    }

    test('single', function() {
      var expected = subject.formatBusytime(
        copy(0)
      );

      stream.emit('occurrence', times[0]);
      assert.length(subject.busytimeQueue, 1);

      assert.hasProperties(
        subject.busytimeQueue[0],
        expected,
        'queued'
      );

      assert.equal(addedTimes[0]._id, expected._id, 'added times');
    });

  });

  suite('#handleEventSync', function() {

    test('recurring', function() {
      var control = serviceEvent('recurringEvent');
      control = subject.formatEvent(control);
      assert.length(control.remote.exceptions, 2);

      var exceptions = control.remote.exceptions;
      delete control.remote.exceptions;

      exceptions = exceptions.map(subject.formatEvent, subject);

      // we need to do this twice so this is a clean
      // copy and the above can be mutated
      var event = serviceEvent('recurringEvent');
      stream.emit('event', event);

      assert.length(subject.eventQueue, 3);

      var order = [control].concat(exceptions);

      // ensure event and all its exceptions are queued
      // and in the correct order (event first exceptions after)
      order.forEach(function(item, idx) {
        assert.hasProperties(subject.eventQueue[idx].remote, {
          id: item.remote.id,
          eventId: item.remote.eventId,
          recurrenceId: item.remote.recurrenceId
        });
      });
    });

    test('new event', function() {
      var existing = serviceEvent('singleEvent');
      existing = subject.formatEvent(existing);
      existing.remote.syncToken = 'abx1';

      var cached = {};
      cached[existing._id] = existing;

      subject = createSubject({ cached: cached });

      assert.deepEqual(
        subject.cached,
        cached,
        'cached'
      );

      assert.deepEqual(
        subject.removeList,
        Object.keys(cached),
        'remove list'
      );

      var newEvent = serviceEvent('singleEvent');
      newEvent.syncToken = 'bbx1';

      assert.notEqual(
        newEvent.syncToken,
        existing.remote.syncToken,
        'sync tokens match'
      );

      stream.emit('event', newEvent);

      assert.length(subject.removeList, 0, 'remove list after sync');
      assert.length(
        subject.eventQueue,
        1
      );
    });

    test('same tokens', function() {
      var existing = serviceEvent('singleEvent');
      existing = subject.formatEvent(existing);

      var cached = {};
      cached[existing._id] = existing;

      subject = createSubject({ cached: cached });

      assert.deepEqual(
        subject.cached,
        cached,
        'cached'
      );

      assert.deepEqual(
        subject.removeList,
        Object.keys(cached),
        'remove list'
      );

      var newEvent = serviceEvent('singleEvent');

      assert.equal(
        newEvent.syncToken,
        existing.remote.syncToken,
        'sync tokens match'
      );

      stream.emit('event', newEvent);

      assert.length(subject.removeList, 0, 'remove list after sync');
      assert.length(
        subject.eventQueue,
        0
      );
    });

    test('event new', function() {
      var event = serviceEvent('singleEvent');
      stream.emit('event', event);

      assert.deepEqual(
        subject.eventQueue,
        [subject.formatEvent(event)]
      );
    });

  });

});
