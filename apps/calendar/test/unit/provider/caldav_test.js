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

  var calendarStore;
  var eventStore;

  setup(function(done) {
    this.timeout(10000);
    app = testSupport.calendar.app();
    controller = app.serviceController;
    db = app.db;

    subject = new Calendar.Provider.Caldav({
      app: app
    });

    calendarStore = app.store('Calendar');
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

  suite('methods that wrap request', function() {
    var calledWith;
    var error;
    var result;
    var input = { user: 'foo' };

    setup(function() {
      controller.request = function() {
        calledWith = arguments;
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

