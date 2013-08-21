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

  /**
   * Gets group from remote id of event and returns the
   * relevant ical component of the event group.
   *
   * @param {Object} event, event whose id from remote is equal
   *  to the eventGroup id we are looking for.
   *
   * @param {String} ical, ical component of the eventGroup to return.
   */
  function getEventId(event, ical) {
    var eventGroup = subject.groups[subject.eventIdFromRemote(event, true)];
    return eventGroup[ical];
  }

  suiteSetup(function(done) {
    this.timeout(10000);
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
    this.timeout(5000);
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

    test('abort during #commit also aborts transaction', function(done) {
      // Stream some events...
      for (var i = 0; i < events.length; i++) {
        stream.emit('event', events[i]);
        stream.emit('eventComplete', {eventId: events[i].id});
      }
      var groupsArray = Object.keys(subject.groups);
      var lastEventGroupKey = groupsArray[groupsArray.length - 1];
      // Detection of transaction abort is a test success.
      subject.groups[lastEventGroupKey].trans.onabort = function() {
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
    var busyTimeStore;
    var streamedAndCommitted;
    var notStreamedOrCommitted;
    var streamedButNotCommitted;

    /**
     * Streams event group components
     *
     * @param {Object} event, ical event to be streamed.
     * @param {Object} busytime, ical busytime to be streamed.
     * @param {Object} component, ical component to be streamed.
     */
    function streamEventGroup(event, busytime, component) {
      subject.stream.emit('event', event);
      subject.stream.emit('occurrence', busytime);
      subject.stream.emit('component', component);
    }

    setup(function() {
      removed.length = 0;
      eventStore = app.store('Event');
      componentStore = app.store('IcalComponent');
      busyTimeStore = app.store('Busytime');

      eventStore.remove = function(id) {
        removed.push(id);
      };

      /**
       * Creates an event, busytime and ical component,
       * with their ids/eventIds corresponding to the id argument.
       *
       * @param {Object} id, the id that the ical data being
       *  formed, must correspond to.
       *
       * @return {Array} array containg a formatted event, event,
       *  busytime and component all with ids/eventIds corresponding to id.
       */
      function createEventAndDependents(id) {
        var tempevent = serviceEvent('singleEvent');
        tempevent.id = id;
        var finalevent = tempevent;
        var formatevent = subject.formatEvent(tempevent);

        var tempbusy = Factory('busytime', {
          eventId: id,
          calendarId: formatevent.calendarId
        });

        var tempcomponent = {
          data: formatevent.remote.icalComponent,
          eventId: tempbusy.eventId
        };
        return {
          formattedEvent: formatevent,
          event: finalevent,
          busytime: tempbusy,
          component: tempcomponent,
          id: id
        };
      }

      // create and allocate first eventGroup which is streamed
      // and committed.
      streamedAndCommitted = createEventAndDependents('foo');

      // create and allocate second eventGroup which is neither
      // streamed nor committed.
      notStreamedOrCommitted = createEventAndDependents('bar');

      // create and allocate third eventGroup.
      streamedButNotCommitted = createEventAndDependents('foobar');

      subject = createSubject();
      // stream first eventGroup.
      streamEventGroup(streamedAndCommitted.event,
        streamedAndCommitted.busytime, streamedAndCommitted.component);
      // signal to commit first eventGroup.
      subject.stream.emit('eventComplete', {eventId: streamedAndCommitted.id});
      // steam third eventGroup but don't commit it.
      streamEventGroup(streamedButNotCommitted.event,
        streamedButNotCommitted.busytime, streamedButNotCommitted.component);
    });

    /**
     * Checks records of event, ical components and busytimes in the database,
     * against the expected presence.
     *
     * @param {Object} busyTimeId, _id of busytime for which to check
     *  the database.
     *
     * @param {Object} eventAndComponentId, _id of the event and ical component
     *  for which to check the database.
     *
     * @param {Boolean} expect, boolean that signifies if we expect to find
     *  given ical data in the database or not.
     *
     * @param {Object} busytime, busyTime object to check the database for.
     * @param {Object} component, component object to check the database for.
     * @param {Object} event, ical event object to check the database for.
     * @param {Function} done, fired after all relevant databse sotres have been
     *  checked and their results verified.
     */
    function checkRecords(busyTimeId, eventAndComponentId, expect,
                          busytime, component, event, done) {
      var trans = db.transaction('busytimes');
      var store = trans.objectStore('busytimes');

      trans.addEventListener('complete', function() {
        if (done) {
          done();
        }
      });
      if (expect) {

        store.get(busyTimeId).onsuccess = function(e) {
          var result = e.target.result;
          // assert that record exists.
          assert.ok(result);

          // assert that result has the properties we expect.
          assert.hasProperties(result, {
            start: busytime.start,
            end: busytime.end,
            eventId: busytime.eventId,
            calendarId: busytime.calendarId
          });
        };
        componentStore.get(eventAndComponentId, function(err, record) {
          assert.ok(record, 'has records');
          assert.deepEqual(record, component);
        });
        eventStore.findByIds([eventAndComponentId], function(err, list) {
          assert.length(Object.keys(list), 1, 'saved events');
          assert.ok(list[eventAndComponentId], 'saved event id');
        });
      } else {
        store.get(busyTimeId).onsuccess = function(e) {
          var result = e.target.result;
          // assert that the record doesn't exist.
          assert.ok(!result);
        };
        componentStore.get(eventAndComponentId, function(err, record) {
          assert.ok(!record);
        });
        eventStore.findByIds([eventAndComponentId], function(err, list) {
          assert.length(Object.keys(list), 0);
          assert.ok(!list[eventAndComponentId]);
        });
      }
    }

    suite('checkForCommit', function() {

      test('verify that first set is committed', function(done) {
        // we streamed and committed first eventGroup, so it should
        // be in the database.
        checkRecords(
          streamedAndCommitted.busytime._id,
          streamedAndCommitted.formattedEvent._id,
          true,
          streamedAndCommitted.busytime,
          streamedAndCommitted.component,
          streamedAndCommitted.event,
          done
        );
      });
      test('verify that second set is not committed', function(done) {
        // we didn't stream nor commit second eventGroup, so it should
        // not be in the database.
        checkRecords(
          notStreamedOrCommitted.busytime._id,
          notStreamedOrCommitted.formattedEvent._id,
          false,
          notStreamedOrCommitted.busytime,
          notStreamedOrCommitted.component,
          notStreamedOrCommitted.event, done
        );
      });
      test('verify that third set is not committed', function(done) {
        // we streamed but did not commit the third eventGroup, so it should
        // not be in the database but it should have be present in
        // subject.groups.
        assert.ok(
          subject.groups[streamedButNotCommitted.formattedEvent._id],
          'check if eventGroup exists'
        );
        checkRecords(
          streamedButNotCommitted.busytime._id,
          streamedButNotCommitted.formattedEvent._id,
          false,
          streamedButNotCommitted.busytime,
          streamedButNotCommitted.component,
          streamedButNotCommitted.event,
          done
        );
      });
    });

    suite('end of stream commit', function() {

      test('commit pending records', function(done) {

        function onComplete() {
          // we never gave the commit signal for the third eventGroup,
          // so it'll still not be in the database.
          checkRecords(
            streamedButNotCommitted.busytime._id,
            streamedButNotCommitted.formattedEvent._id,
            false,
            streamedButNotCommitted.busytime,
            streamedButNotCommitted.component,
            streamedButNotCommitted.event
          );
          // we gave the signal to commit the second eventGroup so it will
          // be in the database.
          checkRecords(
            notStreamedOrCommitted.busytime._id,
            notStreamedOrCommitted.formattedEvent._id,
            true,
            notStreamedOrCommitted.busytime,
            notStreamedOrCommitted.component,
            notStreamedOrCommitted.event,
            done
          );
        };
        subject.on('complete', onComplete);
        // stream second eventGroup
        streamEventGroup(
          notStreamedOrCommitted.event,
          notStreamedOrCommitted.busytime,
          notStreamedOrCommitted.component
        );
        // signal second eventGroup to be committed.
        subject.stream.emit('eventComplete',
          {
            eventId: notStreamedOrCommitted.id
          }
        );
        // signal end of stream.
        subject.stream.emit('end', {});
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
      stream.emit('event', event);
      stream.emit('occurrence', times[0]);
      assert.length(getEventId(event, 'occurrences'), 1);

      // ids are unique each time
      expected._id = getEventId(event, 'occurrences')[0]._id;

      assert.ok(expected._id, 'has id');

      assert.hasProperties(getEventId(event, 'occurrences')[0],
        expected,
        'queued'
      );

      assert.deepEqual(
        getEventId(event, 'alarms').length,
        alarms.length,
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

      var newEvent = serviceEvent('singleEvent');
      newEvent = subject.formatEvent(newEvent);

      var data = {
        data: newEvent.remote.icalComponent,
        lastRecurrenceId: { year: 2012 },
        eventId: serviceEvent('singleEvent').id
      };

      var expected = {};
      for (var key in data) {
        expected[key] = data[key];
      }

      expected.eventId = subject.eventIdFromRemote(
        data
      );

      expected.calendarId = calendar._id;

      subject.stream.emit('event', serviceEvent('singleEvent'));
      subject.stream.emit('component', data);
      assert.length(subject.groups[data.eventId].components, 2);

      assert.deepEqual(
        subject.groups[data.eventId].components[1],
        expected
      );
    });

    test('complete recurrence', function() {
      var newEvent = serviceEvent('singleEvent');
      newEvent = subject.formatEvent(newEvent);

      var data = {
        data: newEvent.remote.icalComponent,
        lastRecurrenceId: false,
        eventId: serviceEvent('singleEvent').id
      };

      subject.stream.emit('event', serviceEvent('singleEvent'));
      stream.emit('component', data);
      assert.length(subject.groups[data.eventId].components, 2);

      assert.ok(
        !('lastRecurrenceId' in subject.groups[data.eventId].components[1]),
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

      assert.length(getEventId(event, 'components'), 1);

      assert.hasProperties(
        subject.groups[control._id].components[0],
        {
          eventId: control._id,
          data: control.remote.icalComponent
        }
      );

      var order = [control].concat(exceptions);
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

      assert.equal(
        getEventId(newEvent, 'events')[0].id,
        newEvent._id
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
        [getEventId(event, 'events')[0]],
        [subject.formatEvent(event)]
      );
    });

  });

});
