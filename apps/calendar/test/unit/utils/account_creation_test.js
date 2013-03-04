requireApp('calendar/test/unit/helper.js', function() {
  requireLib('utils/account_creation.js');
  requireLib('models/account.js');
});

suite('utils/account_creation', function() {
  var subject;
  var accountStore;
  var calendarStore;
  var app;

  setup(function() {
    app = testSupport.calendar.app();
    accountStore = app.store('Account');
    calendarStore = app.store('Calendar');

    subject = new Calendar.Utils.AccountCreation(
      app
    );
  });

  test('initialization', function() {
    assert.equal(subject.app, app);
    assert.instanceOf(subject, Calendar.Responder);
  });

  suite('#send', function() {
    var verifyCall;
    var syncCall;
    var calendarSyncCalls = [];
    var events;
    var model;

    var calendars = {
      one: {},
      two: {}
    };

    var handler = {
      handleEvent: function(event) {
        var type = event.type;
        var data = event.data;

        if (type in events) {
          throw new Error('event ' + type + ' fired twice');
        }

        events[type] = data;
      }
    };

    setup(function() {
      events = {};
      syncCall = null;
      verifyCall = null;
      calendarSyncCalls.length = 0;

      model = new Calendar.Models.Account(
        Factory('account')
      );


      subject.on('authorizeError', handler);
      subject.on('authorize', handler);
      subject.on('calendarSyncError', handler);
      subject.on('calendarSync', handler);

      accountStore.verifyAndPersist = function() {
        verifyCall = arguments;
      };

      accountStore.sync = function() {
        syncCall = arguments;
      };

      calendarStore.remotesByAccount = function() {
        return calendars;
      };

      calendarStore.sync = function() {
        calendarSyncCalls.push(Array.slice(arguments));
      };
    });

    test('success', function(done) {
      var savedAccount;

      subject.send(model, function(err, result) {
        assert.ok(!err, 'is a success');

        assert.ok(verifyCall);
        assert.ok(syncCall);
        assert.equal(result, savedAccount);

        done();
      });

      assert.equal(verifyCall[0], model, 'calls verify');
      assert.ok(!syncCall, 'has not synced yet');

      var savedAccount = model.toJSON();
      savedAccount._id = 1;
      verifyCall[1](null, savedAccount._id, savedAccount);

      assert.deepEqual(
        events.authorize,
        [savedAccount]
      );

      assert.equal(syncCall[0], savedAccount, 'syncs with persisted model');

      // TODO: we don't pass calendars should we?
      syncCall[1]();

      // verify each calendar was synced..
      assert.length(calendarSyncCalls, 2);

      assert.deepEqual(
        calendarSyncCalls[0].slice(0, 2),
        [savedAccount, calendars.one]
      );

      assert.deepEqual(
        calendarSyncCalls[1].slice(0, 2),
        [savedAccount, calendars.two]
      );

      assert.deepEqual(
        events.calendarSync,
        []
      );
    });

    test('account failure', function(done) {
      var accountErr = new Error();

      subject.send(model, function(err) {
        assert.equal(err, accountErr);
        done();
      });

      assert.ok(verifyCall, 'calls verify');
      verifyCall[1](accountErr);

      assert.deepEqual(
        events.authorizeError,
        [accountErr]
      );
    });

    test('calendar failure', function(done) {
      var calendarErr = new Error();

      subject.send(model, function(err) {
        assert.deepEqual(
          events.calendarSyncError,
          [calendarErr]
        );

        assert.equal(err, calendarErr);
        done();
      });

      // send account
      var account = model.toJSON();
      account._id = 1;
      verifyCall[1](null, account);

      // on sync we send the error
      syncCall[1](calendarErr);
    });

  });
});
