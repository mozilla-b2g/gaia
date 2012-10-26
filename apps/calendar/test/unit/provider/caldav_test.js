requireApp('calendar/test/unit/helper.js', function() {
  requireApp('calendar/test/unit/provider/mock_stream.js');
  requireLib('provider/caldav_pull_events.js');
  requireLib('provider/abstract.js');
  requireLib('provider/caldav.js');
  requireLib('models/account.js');
  requireLib('models/calendar.js');
});

suite('provider/caldav', function() {

  var subject;
  var app;
  var controller;
  var db;

  var accountStore;
  var calendarStore;
  var componentStore;
  var eventStore;

  var calendar;
  var account;

  setup(function(done) {
    this.timeout(10000);
    app = testSupport.calendar.app();
    controller = app.serviceController;
    db = app.db;

    subject = new Calendar.Provider.Caldav({
      app: app
    });

    calendar = Factory('calendar', { _id: 'one', accountId: 'one' });
    account = Factory('account', { _id: 'one' });

    calendarStore = app.store('Calendar');
    accountStore = app.store('Account');
    componentStore = app.store('IcalComponent');

    accountStore.cached[account._id] = account;
    calendarStore.cached[calendar._id] = calendar;

    eventStore = app.store('Event');
    db.open(done);
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      db,
      [
        'accounts', 'calendars',
        'events', 'busytimes',
        'icalComponents'
      ],
      done
    );
  });

  teardown(function() {
    db.close();
  });

  test('initialization', function() {
    assert.instanceOf(
      subject,
      Calendar.Provider.Abstract
    );

    assert.equal(
      subject.service,
      app.serviceController
    );
  });

  test('capabilites', function() {
    assert.isTrue(subject.useUrl);
    assert.isTrue(subject.useCredentials);
  });

  suite('#eventCapabilities', function() {
    test('recurring', function() {
      var event = Factory('event', {
        remote: {
          isRecurring: true
        }
      });

      var expected = {
        canUpdate: false,
        canDelete: false,
        canCreate: false
      };

      var actual = subject.eventCapabilities(event);
      assert.deepEqual(actual, expected);
    });

    test('normal', function() {
      var event = Factory('event');
      assert.isFalse(event.remote.isRecurring);

      var expected = {
        canUpdate: true,
        canCreate: true,
        canDelete: true
      };

      var actual = subject.eventCapabilities(event);
      assert.deepEqual(actual, expected);
    });
  });

  suite('methods that wrap request', function() {
    var calledWith;
    var error;
    var result;
    var input = { user: 'foo' };

    setup(function() {
      controller.request = function() {
        calledWith = Array.prototype.slice.call(arguments);
        var cb = arguments[arguments.length - 1];
        setTimeout(function() {
          cb(error, result);
        }, 0);
      };
    });

    suite('#getAccount', function() {
      test('success', function(done) {
        result = { id: 'wow' };

        subject.getAccount(input, function cb(cbError, cbResult) {
          done(function() {
            assert.equal(cbResult, result);
            assert.equal(cbError, error);
          });
        });
      });

      test('error handling', function(done) {
        error = new Error();
        error.constructorName = 'CaldavHttpError';
        error.code = 404;
        var errorMsg = 'no-url';
        subject.getAccount(input, function cb(cbError, cbResult) {
          done(function() {
            assert.equal(cbError, errorMsg);
          });
        });
      });
    });

    suite('#findCalendars', function() {
      test('success', function(done) {
        result = [{ id: 'wow' }];
        error = null;

        subject.findCalendars(input, function cb(cbError, cbResult) {
          done(function() {
            assert.deepEqual(calledWith, [
              'caldav', 'findCalendars', input, cb
            ]);
            assert.equal(cbResult, result);
            assert.equal(cbError, error);
          });
        });
      });
    });

    suite('#createEvent', function() {
      var event;
      var id;

      setup(function(done) {
        event = Factory('event', {
          calendarId: calendar._id
        });

        result = Factory.create('event').remote;
        result.id = 'foo';
        result.syncToken = 'hit';
        result.icalComponent = 'xfoo';

        id = calendar._id + '-foo';

        subject.createEvent(event, done);
      });

      test('icalComponent', function(done) {
        componentStore.get(id, function(err, result) {
          done(function() {
            assert.deepEqual(result, {
              eventId: id,
              data: 'xfoo'
            });
          });
        });
      });

      test('event', function(done) {
        eventStore.get(id, function(err, result) {
          var remote = result.remote;
          assert.equal(remote.id, 'foo');
          assert.equal(remote.syncToken, 'hit');
          assert.ok(!remote.icalComponent, 'does not have icalComponent');
          done();
        });
      });

    });

    suite('#updateEvent', function() {
      var event;
      var component;

      setup(function(done) {
        var trans = eventStore.db.transaction(
          ['events', 'icalComponents'],
          'readwrite'
        );

        trans.oncomplete = function() {
          done();
        };

        event = Factory('event', {
          calendarId: calendar._id
        });

        component = Factory('icalComponent', {
          eventId: event._id,
          data: 'original'
        });

        eventStore.persist(event, done);
        componentStore.persist(component, done);
      });

      setup(function(done) {
        result = Factory.create('event').remote;
        result.icalComponent = 'xfooo';
        result.syncToken = 'changedmefoo';
        subject.updateEvent(event, done);
      });

      test('sent data', function() {
        var details = calledWith[calledWith.length - 2];

        assert.ok(details.event, 'sends event');

        assert.equal(
          details.icalComponent,
          'original',
          'icalComponent'
        );
      });

      test('component', function(done) {
        componentStore.get(event._id, function(err, item) {
          done(function() {
            assert.deepEqual(
              item,
              { eventId: event._id, data: 'xfooo' }
            );
          });
        });
      });

      test('event', function(done) {
        eventStore.get(event._id, function(err, item) {
          done(function() {
            assert.equal(item.remote.syncToken, result.syncToken);
          });
        });

      });

    });

    suite('#deleteEvent', function() {
      test('success', function(done) {
        var event = Factory('event', {
          calendarId: calendar._id
        });

        subject.deleteEvent(event, function() {
          done(function() {
            assert.equal(calledWith[0], 'caldav');
            assert.equal(calledWith[1], 'deleteEvent');
            assert.deepEqual(
              calledWith.slice(2, 5),
              [account, calendar.remote, event.remote]
            );
          });
        });
      });
    });
  });

  suite('#_cachedEventsFor', function() {
    var events = [];
    var calendar;

    setup(function(done) {
      events.length = 0;
      calendar = Factory('calendar');
      calendarStore.persist(calendar, done);
    });

    // create some events
    var i = 0;
    for (; i < 2; i++) {
      setup(function(done) {
        var event = Factory('event', {
          calendarId: calendar._id,
          remote: {
            id: i,
            url: 'some_foo_' + i + '.ics',
            syncToken: i
          }
        });

        events.push(event);
        eventStore.persist(event, done);
      });
    }

    test('result', function(done) {
      var expected = Object.create(null);
      events.forEach(function(item) {
        expected[item.remote.url] = {
          syncToken: item.remote.syncToken,
          id: item._id
        };
      });

      subject._cachedEventsFor(calendar, function(err, result) {
        done(function() {
          assert.deepEqual(result, expected);
        });
      });
    });
  });

  suite('#syncEvents', function() {
    var account;
    var calendar;
    var events = [];

    var calledWith;

    function addEvent(cb) {
      setup(function(done) {
        var event = cb();
        events.push(event);
        eventStore.persist(event, done);
      });
    }

    setup(function(done) {
      calledWith = null;
      events.length = 0;

      subject._syncEvents = function() {
        calledWith = arguments;
        var cb = calledWith[calledWith.length - 1];
        setTimeout(cb, 0, null);
      };

      var trans = db.transaction(
        ['accounts', 'calendars'],
        'readwrite'
      );

      account = Factory('account', {
        providerType: 'Caldav'
      });

      calendar = Factory('calendar');

      trans.oncomplete = function() {
        done();
      };

      accountStore.persist(account, trans);
      calendarStore.persist(calendar, trans);
    });

    suite('sync with cached events', function() {
      addEvent(function() {
        return Factory('event', {
          calendarId: calendar._id,
          remote: {
            url: 'one.ics',
            syncToken: 'one'
          }
        });
      });

      test('result', function(done) {
        subject.syncEvents(account, calendar, function() {
          done(function() {
            assert.equal(calledWith[0], account, 'has account');
            assert.equal(calledWith[1], calendar, 'has calendar');

            // expected cached events (url -> sync token)
            var sentCache = calledWith[2];
            assert.ok(sentCache, 'sends cache');
            assert.ok(sentCache[events[0].remote.url], 'sends url');
          });
        });
      });
    });

    suite('sync tokens match', function() {
      setup(function() {
        calendar.lastEventSyncToken = 'sync';
        calendar.remote.syncToken = 'sync';
      });

      test('result', function(done) {
        // tokens match should not sync!
        subject.syncEvents(account, calendar, function() {
          assert.ok(!calledWith);
          done();
        });
      });

    });

  });

  suite('#_syncEvents', function() {
    var calledWith;
    var account;
    var calendar;
    var cached = {};

    setup(function() {
      subject.service.stream = function() {
        var args = Array.slice(arguments);

        if (!args.shift() === 'caldav')
          throw new Error('expected caldav service');

        if (!args.shift() === 'streamEvents')
          throw new Error('expected streamEvents');


        calledWith = args;
        var stream = new Calendar.Responder();
        stream.request = function() {};
        return stream;
      };

      account = Factory('account');
      calendar = Factory('calendar');
    });

    test('with first sync date', function() {
      calendar.firstEventSyncDate = new Date(2012, 0, 1);
      var expectedDate = new Date(2012, 0, 1 - subject.daysToSyncInPast);
      var options = {
        startDate: expectedDate,
        cached: cached
      };

      var pull = subject._syncEvents(
        account, calendar, cached
      );

      var expected = [
        account.toJSON(),
        calendar.remote,
        options
      ];

      assert.deepEqual(
        calledWith,
        expected
      );

      assert.instanceOf(pull, Calendar.Provider.CaldavPullEvents);

      assert.equal(pull.account, account);
      assert.equal(pull.calendar, calendar);
    });

    test('without first sync date', function() {
      var now = Calendar.Calc.createDay(new Date());
      now.setDate(now.getDate() - subject.daysToSyncInPast);

      var options = {
        startDate: now,
        cached: cached
      };

      subject._syncEvents(account, calendar, cached);

      var expected = [
        account.toJSON(),
        calendar.remote,
        options
      ];

      assert.deepEqual(
        calledWith,
        expected
      );
    });
  });

});
