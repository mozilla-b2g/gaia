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

    accountStore.cached[account._id] = account;
    calendarStore.cached[calendar._id] = calendar;

    eventStore = app.store('Event');
    db.open(done);
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      db,
      ['accounts', 'calendars', 'events', 'busytimes'],
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
            assert.deepEqual(calledWith, [
              'caldav', 'getAccount', input, cb
            ]);
            assert.equal(cbResult, result);
            assert.equal(cbError, error);
          });
        });
      });
    });

    suite('#findCalendars', function() {
      test('success', function(done) {
        result = [{ id: 'wow' }];

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
      test('success', function(done) {
        var event = Factory('event', {
          calendarId: calendar._id
        });

        result = Factory.create('event').remote;
        result.id = 'foo';
        result.syncToken = 'hit';
        result.icalComponent = 'xfoo';

        var id = calendar._id + '-foo';

        subject.createEvent(event, function() {
          eventStore.get(id, function(err, result) {
            var remote = result.remote;
            assert.equal(remote.id, 'foo');
            assert.equal(remote.syncToken, 'hit');
            assert.equal(remote.icalComponent, 'xfoo');
            done();
          });
        });
      });
    });

    suite('#updateEvent', function() {
      var event;

      setup(function(done) {
        event = Factory('event', {
          calendarId: calendar._id
        });
        eventStore.persist(event, done);
      });

      test('simple event', function(done) {
        result = Factory.create('event').remote;
        result.icalComponent = 'xfooo';

        subject.updateEvent(event, function(err, data) {
          eventStore.get(event._id, function(err, result) {
            done(function() {
              assert.equal(result.remote.icalComponent, 'xfooo');
            });
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

  suite('#_buildEventsFor', function() {
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
          calendarId: calendar._id
        });

        events.push(event);
        eventStore.persist(event, done);
      });
    }

    test('result', function(done) {
      var expected = Object.create(null);
      events.forEach(function(item) {
        expected[item._id] = item;
      });

      subject._buildEventsFor(calendar, function(err, result) {
        done(function() {
          assert.deepEqual(result, expected);
        });
      });
    });

  });

  suite('#syncEvents - calendar syncToken skip', function() {
    var account, calendar;

    setup(function() {
      account = Factory('account', {
        providerType: 'Caldav'
      });

      calendar = Factory('calendar', {
        _id: 1,
        lastEventSyncToken: 'synced',
        remote: { syncToken: 'synced' }
      });

    });

    setup(function(done) {
      app.store('Account').persist(account, done);
    });

    setup(function(done) {
      calendarStore.persist(calendar, done);
    });

    test('result', function(done) {
      subject._syncEvents = function() {
        done(new Error('should not sync!'));
      }

      // tokens match should not sync!
      subject.syncEvents(account, calendar, function() {
        done();
      });
    });
  });



});

