requireApp('calendar/test/unit/provider/mock_stream.js');
requireApp('calendar/js/ext/uuid.js');
requireApp('calendar/test/unit/service/helper.js');
requireLib('ext/ical.js');
requireLib('ext/caldav.js');
requireLib('service/caldav.js');
requireLib('service/ical_recur_expansion.js');
requireLib('models/account.js');
requireLib('models/calendar.js');

suiteGroup('Provider.CaldavPullEvents', function() {
  var fixtures;
  var ical;
  var subject;
  var controller;
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

    stream = new Calendar.Responder();

    options.app = app;

    return new Calendar.Provider.CaldavPullEvents(
      stream,
      options
    );
  }

  suiteSetup(function(done) {
    ical = new ServiceSupport.Fixtures('ical');
    ical.load('single_event');
    ical.load('daily_event');
    ical.load('recurring_event');
    ical.onready = done;
    fixtures = {};

    ServiceSupport.setExpansionLimit(10);

    service = new Calendar.Service.Caldav(
      new Calendar.Responder()
    );
  });

  suiteTeardown(function() {
    ServiceSupport.resetExpansionLimit();
  });

  ['singleEvent', 'dailyEvent', 'recurringEvent'].forEach(function(item) {
    setup(function(done) {
      service.parseEvent(ical[item], function(err, event) {
        fixtures[item] = service._formatEvent(
          'abc', '/foobar.ics',
          ical[item], event
        );
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
    app = testSupport.calendar.app();
    db = app.db;
    controller = app.timeController;

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
      ['accounts', 'calendars', 'icalComponents',
       'events', 'busytimes', 'alarms'],
      done
    );
  });

  teardown(function() {
    db.close();
  });

  test('initializer', function() {
    var subject = createSubject();

    assert.instanceOf(subject.calendar, Calendar.Models.Calendar, '.calendar');
    assert.instanceOf(subject.account, Calendar.Models.Account, '.account');
    assert.equal(subject.app, app);
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

    function expand(name, limit) {
      setup(function(done) {
        times.length = 0;

        event = serviceEvent(name);
        var stream = new Calendar.Responder();

        stream.on('occurrence', function(item) {
          times.push(item);
        });

        service.expandRecurringEvent(
          ical[name],
          {},
          stream,
          done
        );
      });
    }

    suite('without exceptions', function() {
      expand('dailyEvent');

      test('non-exception result', function() {
        var time = times[1];
        assert.isFalse(time.isException, 'is exception');

        var result = subject.formatBusytime(time);
        var modelCopy = Object.create(result);
        modelCopy = app.store('Busytime').initRecord(modelCopy);

        assert.hasProperties(
          result,
          modelCopy,
          'is a model'
        );

        var eventId = result.eventId;
        var calendarId = result.calendarId;

        assert.ok(eventId, 'has event');
        assert.ok(calendarId, 'has calendar');

        assert.instanceOf(result.alarms, Array);

        result.alarms.forEach(function(alarm) {
          assert.equal(alarm.busytimeId, result._id);
          assert.equal(alarm.eventId, eventId);
        });
      });
    });

    suite('with exceptions', function() {
      expand('recurringEvent');

      test('result', function() {
        var time = times[2];
        assert.isTrue(time.isException, 'is exception');

        var eventId = subject.eventIdFromRemote(
          time
        );

        var result = subject.formatBusytime(time);
        assert.ok(result._id, 'has id');

        assert.equal(result.calendarId, calendar._id);

        assert.include(
          result.eventId,
          times[2].recurrenceId.utc,
          'has utc time'
        );

        assert.equal(result.eventId, eventId);
      });
    });
  });

  suite('bug 809607', function() {

    var accountStore;
    var account;

    setup(function(done) {
      accountStore = app.store('Account');
      account = Factory.create('account');
      accountStore.persist(account, done);
    });

    var calendar;

    setup(function(done) {
      calendar = Factory.create('calendar');
      calendar.accountId = account._id;
      calendar.remote.syncToken = 'bug-809607';
      calendar.syncToken = 'bug-809607';
      app.store('Calendar').persist(calendar, done);
    });

    var subject;
    var events;
    var eventPersistCt;
    var eventStore;

    setup(function() {
      subject = createSubject({account: account, calendar: calendar});

      events = [];
      for (var i = 0; i < 4; i++) {
        events.push(serviceEvent('singleEvent'));
      }

      // Set up to count events persisted.
      eventPersistCt = 0;
      eventStore = app.store('Event');
      eventStore.on('persist', function(id) {
        eventPersistCt++;
      });
    });

    test('account deletion during sync aborts processing', function(done) {
      // Stream a couple of events before account removal
      stream.emit('event', events[0]);
      stream.emit('event', events[1]);

      function afterRemove() {
        // Stream a couple of events after account removal
        stream.emit('event', events[2]);
        stream.emit('event', events[3]);

        // Attempt to commit the events
        subject.commit(function() {
          setTimeout(afterCommit, 0);
        });
      }

      function afterCommit() {
        // After account removal and commit, no events should have been saved.
        assert.equal(eventPersistCt, 0);
        done();
      }

      // Kick off the removal and subsequent steps...
      accountStore.remove(account._id, function() {
        setTimeout(afterRemove, 0);
      });
    });

    test('abort during #commit also aborts transaction', function(done) {
      // Stream some events...
      for (var i = 0; i < events.length; i++) {
        stream.emit('event', events[i]);
      }

      subject.commit(function() {
        // No-op
      });

      // Detection of transaction abort is a test success.
      subject._trans.onabort = function() {
        // Restore the exception handler.
        done();
      };

      // Queue up account removal...
      accountStore.emit('remove', account._id);
    });

  });

  suite('#commit', function() {
    var removed = [];
    var eventStore;
    var componentStore;
    var newEvent;
    var newBusytime;
    var alarm;
    var addedComponent;

    setup(function() {
      removed.length = 0;
      eventStore = app.store('Event');
      componentStore = app.store('IcalComponent');

      eventStore.remove = function(id) {
        removed.push(id);
      };

      newEvent = serviceEvent('singleEvent');
      newEvent = subject.formatEvent(newEvent);

      addedComponent = {
        eventId: newEvent._id,
        ical: 'foo'
      };

      subject.icalQueue.push(addedComponent);

      subject.eventQueue.push(newEvent);
      subject.removeList = ['1'];

      newBusytime = Factory('busytime', {
        eventId: newEvent._id,
        calendarId: newEvent.calendarId
      });

      subject.busytimeQueue.push(newBusytime);

      alarm = Factory('alarm', {
        startDate: new Date(),
        eventId: newEvent._id,
        busytimeId: newBusytime._id
      });

      subject.alarmQueue.push(alarm);
    });

    function commit(fn) {
      setup(function(done) {
        subject.commit(function() {
          setTimeout(function() {
            done();
          }, 0);
        });
      });
    }

    suite('busytime/alarm', function() {
      commit();

      test('alarm', function(done) {
        var trans = db.transaction('alarms');
        var store = trans.objectStore('alarms');
        var index = store.index('busytimeId');

        index.get(alarm.busytimeId).onsuccess = function(e) {
          done(function() {
            var data = e.target.result;
            assert.ok(data, 'has alarm');
            assert.hasProperties(data, alarm, 'alarm matches');
          });
        };
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

    });

    suite('without remove list', function() {
      setup(function() {
        subject.removeList = null;
      });

      test('result', function(done) {
        subject.commit(done);
      });
    });

    suite('event/component', function() {
      commit();

      test('component', function(done) {
        componentStore.get(newEvent._id, function(err, record) {
          if (err) {
            done(err);
            return;
          }
          done(function() {
            assert.ok(record, 'has records');
            assert.deepEqual(record, addedComponent);
          });
        });
      });

      test('event', function(done) {
        eventStore.findByIds([newEvent._id], function(err, list) {
          done(function() {
            assert.length(Object.keys(list), 1, 'saved events');
            assert.ok(list[newEvent._id], 'saved event id');
          });
        });
      });
    });
  });

  suite('#handleOccurrenceSync', function() {
    var addedTimes = [];
    var times = [];
    var event;

    setup(function(done) {
      event = serviceEvent('dailyEvent');
      addedTimes.length = 0;

      var store = app.store('Busytime');

      controller.cacheBusytime = function(given) {
        addedTimes.push(given);
      };

      var stream = new Calendar.Responder();

      stream.on('occurrence', function(item) {
        times.push(item);
      });

      service.expandRecurringEvent(
        ical.dailyEvent,
        {},
        stream,
        done
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

      var alarms = expected.alarms;
      delete expected.alarms;
      assert.ok(alarms, 'has alarms');

      stream.emit('occurrence', times[0]);
      assert.length(subject.busytimeQueue, 1);

      // ids are unique each time
      expected._id = subject.busytimeQueue[0]._id;
      assert.ok(expected._id, 'has id');

      assert.hasProperties(
        subject.busytimeQueue[0],
        expected,
        'queued'
      );

      assert.ok(!subject.busytimeQueue[0].alarms, 'removes alarms');

      assert.deepEqual(
        subject.alarmQueue.length, alarms.length,
        'moves moves to alarm queue'
      );

      assert.equal(addedTimes[0]._id, expected._id, 'added times');
    });

  });

  test('#handleMissingEvents', function() {
    stream.emit('missingEvents', ['1', '2']);
    assert.deepEqual(subject.removeList, ['1', '2']);
  });

  suite('#handleComponentSync', function() {
    test('incomplete recurrence', function() {
      var data = {
        eventId: 'foo',
        lastRecurrenceId: { year: 2012 },
        ical: 'ical'
      };

      var expected = {};
      for (var key in data) {
        expected[key] = data[key];
      }

      expected.eventId = subject.eventIdFromRemote(
        data
      );

      expected.calendarId = calendar._id;

      stream.emit('component', data);
      assert.length(subject.icalQueue, 1);

      assert.deepEqual(
        subject.icalQueue[0],
        expected
      );
    });

    test('complete recurrence', function() {
      var data = {
        lastRecurrenceId: false,
        ical: 'ical'
      };

      stream.emit('component', data);
      assert.length(subject.icalQueue, 1);

      assert.ok(
        !('lastRecurrenceId' in subject.icalQueue[0]),
        'has not lastRecurrenceId'
      );
    });
  });

  suite('#handleEventSync', function() {

    test('recurring', function() {
      // control is needed to verify we have not mutated
      // the results by using the same object during the test.
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
      assert.length(subject.icalQueue, 1);

      assert.hasProperties(
        subject.icalQueue[0],
        {
          eventId: control._id,
          data: control.remote.icalComponent
        }
      );

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

      subject = createSubject();

      var newEvent = serviceEvent('singleEvent');

      newEvent.syncToken = 'bbx1';
      assert.notEqual(
        newEvent.syncToken,
        existing.remote.syncToken,
        'sync tokens match'
      );

      stream.emit('event', newEvent);

      assert.length(
        subject.eventQueue,
        1
      );
    });

    test('event new', function() {
      var calledWith;
      controller.cacheEvent = function() {
        calledWith = arguments;
      };

      var event = serviceEvent('singleEvent');
      stream.emit('event', event);

      assert.hasProperties(
        calledWith[0].remote,
        event.remote,
        'caches remote event'
      );

      assert.deepEqual(
        subject.eventQueue,
        [subject.formatEvent(event)]
      );
    });

  });

});
