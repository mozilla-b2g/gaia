requireApp('calendar/test/unit/helper.js', function() {
  requireLib('models/calendar.js');
  requireLib('models/account.js');
  requireLib('controllers/sync.js');
});

suite('controllers/sync', function() {

  var account;
  var calendar;
  var event;

  var subject;
  var app;
  var db;

  var accModel;

  setup(function(done) {
    this.timeout(10000);

    app = testSupport.calendar.app();
    db = app.db;
    subject = new Calendar.Controllers.Sync(app);

    calendar = app.store('Calendar');
    account = app.store('Account');
    event = app.store('Event');

    accModel = Factory('account', {
      _id: 'one'
    });

    db.open(function(err) {
      if (err) {
        done(err);
        return;
      }
      done();
    });
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
    assert.equal(subject.app, app);
    assert.equal(subject.pending, 0);
  });

  test('sync all, no accounts', function(done) {
    subject.once('syncComplete', done);
    subject.all();
  });

  suite('#all', function() {
    var list = [];

    setup(function(done) {
      var trans = db.transaction('accounts', 'readwrite');

      list.push(Factory('account'));
      list.push(Factory('account'));

      account.persist(list[0], trans);
      account.persist(list[1], trans);

      trans.oncomplete = function() {
        done();
      };
    });

    test('sync account', function() {
      var calledModels = [];

      subject.account = function(model) {
        calledModels.push(model);
      };

      subject.all();

      assert.deepEqual(
        calledModels,
        list,
        'requests a sync of all accounts'
      );
    });
  });

  suite('individual sync operations', function() {
    var calendars;
    var accountSyncCall;
    var calendarSyncCalls;
    var events;

    function assertEmit(event) {
      assert.isTrue(
        (event in events),
        'has emitted ' + event
      );
    }

    function assertDoesNotEmit(event) {
      assert.isFalse(
        (event in events),
        'emitted ' + event
      );
    }

    var handler = {
      handleEvent: function(event) {
        events[event.type] = event.data;
      }
    };

    setup(function(done) {
      var trans = db.transaction(
        ['accounts', 'calendars'],
        'readwrite'
      );

      trans.oncomplete = function() {
        done();
      };

      // setup events
      events = {};
      subject.on('syncStart', handler);
      subject.on('syncComplete', handler);

      // setup mocks
      calendarSyncCalls = [];
      account.sync = function() {
        accountSyncCall = Array.slice(arguments);
      };

      calendar.sync = function() {
        calendarSyncCalls.push(Array.slice(arguments));
      };

      // setup db
      calendars = [];
      account.persist(accModel, trans);

      var numberOfCalendars = 2;
      while (numberOfCalendars--) {
        var item = Factory('calendar', {
          accountId: accModel._id
        });

        calendars.push(item);
        calendar.persist(item, trans);
      }
    });

    suite('#account', function() {
      test('success', function() {
        var firedCallback = false;
        subject.account(accModel, function() {
          firedCallback = true;
        });

        assertEmit('syncStart');
        assert.equal(accountSyncCall[0], accModel);

        // successful sync
        accountSyncCall[1]();

        // not done until calendars have synced
        assertDoesNotEmit('syncComplete');
        assert.length(calendarSyncCalls, 2);

        // complete all calls
        calendarSyncCalls.forEach(function(item) {
          var cb = item.pop();
          assert.ok(
            !firedCallback,
            'does not fire callback before all are complete'
          );
          cb();
        });

        assert.ok(firedCallback, 'fires after all sync operations');
        assertEmit('syncComplete');
      });
    });

    suite('#calendar', function() {

      test('multiple in progress', function() {
        var complete = 0;

        subject.calendar(accModel, calendars[0]);
        assertEmit('syncStart');
        delete events['syncStart'];

        subject.calendar(accModel, calendars[1]);
        assertDoesNotEmit('syncStart');

        var firstSync = calendarSyncCalls.shift();
        firstSync[firstSync.length - 1]();

        // because there are two pending...
        assertDoesNotEmit('syncComplete');

        var secondSync = calendarSyncCalls.shift();
        secondSync[secondSync.length - 1]();

        // now both are fully completed.
        assertEmit('syncComplete');
      });

      test('success', function(done) {
        subject.calendar(accModel, calendars[0], function() {
          assertEmit('syncComplete');
          done();
        });
        assertEmit('syncStart');

        assert.length(calendarSyncCalls, 1, 'emits syncComplete');

        var sync = calendarSyncCalls[0];

        assert.deepEqual(
          sync.slice(0, 2),
          [accModel, calendars[0]]
        );

        assertDoesNotEmit('syncComplete');
        sync[sync.length - 1]();
      });

      test('failure', function(done) {
        var sentErr = new Error();

        subject.calendar(accModel, calendars[0], function(err) {
          assert.equal(err, sentErr);
          assertEmit('syncComplete');
          done();
        });

        var sync = calendarSyncCalls.shift();
        assert.ok(sync);

        sync[sync.length - 1](sentErr);
      });
    });
  });

});
