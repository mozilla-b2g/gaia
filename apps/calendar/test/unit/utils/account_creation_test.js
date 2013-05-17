suiteGroup('Utils.AccountCreation', function() {
  var subject;
  var accountStore;
  var calendarStore;
  var app;

  var account;
  var provider;

  testSupport.calendar.loadObjects(
    'Models.Account',
    'Models.Calendar'
  );

  setup(function(done) {
    app = testSupport.calendar.app();
    accountStore = app.store('Account');
    calendarStore = app.store('Calendar');

    subject = new Calendar.Utils.AccountCreation(
      app
    );

    provider = app.provider('Mock');
    account = Factory('account', {
      user: 'special',
      providerType: 'Mock'
    });

    app.db.open(done);
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      app.db,
      ['accounts', 'calendars'],
      function() {
        app.db.close();
        done();
      }
    );
  });

  test('initialization', function() {
    assert.equal(subject.app, app);
    assert.instanceOf(subject, Calendar.Responder);
  });

  suite('#send - success', function() {

    // sync capture setup
    var onAccountSync;
    var calendarSyncs;

    setup(function() {
      onAccountSync = null;
      calendarSyncs = {};

      calendarStore.sync = function(givenAccount, calendar) {
        assert.equal(givenAccount.user, account.user);
        calendarSyncs[calendar.remote.id] = calendar.remote;
      };

      var realSync = accountStore.sync;
      accountStore.sync = function(model, callback) {
        realSync.call(this, model, function() {
          if (onAccountSync) {
            onAccountSync(model, Array.slice(arguments));
          }
          callback.apply(this, arguments);
        });
      };
    });

    var calendars;

    var calendarSyncSent;
    var callsAccountSync;
    var authorizeSent;

    setup(function() {
      callsAccountSync = false;
      authorizeSent = false;
      calendarSyncSent = false;

      subject.on('calendarSync', function() {
        calendarSyncSent = true;
      });

      subject.on('authorize', function() {
        authorizeSent = true;
      });

      onAccountSync = function() {
        callsAccountSync = true;
      };

      calendars = {
        one: Factory('remote.calendar', { id: 'one' }),
        two: Factory('remote.calendar', { id: 'two' })
      };
    });

    suite('success', function() {
      setup(function(done) {
        provider.stageFindCalendars(
          account.user,
          null,
          calendars
        );

        subject.send(account, done);
      });

      test('account persistence', function(done) {
        accountStore.get(account._id, function(err, model) {
          if (err) {
            return done(err);
          }

          done(function() {
            assert.hasProperties(
              model,
              account
            );
          });
        });
      });

      test('events and calendar sync', function() {
        assert.isTrue(calendarSyncSent, 'calls calendar sync');
        assert.isTrue(authorizeSent, 'authorizes account');
        assert.isTrue(callsAccountSync, 'syncs account');
        assert.deepEqual(calendarSyncs, calendars);
      });

    });

    suite('failures', function() {

      test('account failure', function(done) {
        var accountErr = new Error();
        var authorizeErrorSent = false;

        subject.on('authorizeError', function() {
          authorizeErrorSent = Array.slice(arguments);
        });

        provider.stageGetAccount(account.user, accountErr);

        subject.send(account, function(err) {
          done(function() {
            assert.isFalse(authorizeSent, 'does not send authorize');
            assert.isFalse(calendarSyncSent, 'does not send calendar sync');

            assert.equal(err, accountErr);
            assert.deepEqual(authorizeErrorSent, [accountErr]);
          });
        });
      });

      test('calendar failure', function(done) {
        var calendarErr = new Error();
        var calendarSyncError;

        subject.on('calendarSyncError', function() {
          calendarSyncError = Array.slice(arguments);
        });

        provider.stageFindCalendars(account.user, calendarErr);

        subject.send(account, function(err) {
          done(function() {
            assert.equal(err, calendarErr, 'sends sync failure');
            assert.isTrue(authorizeSent, 'can authorize');
            assert.isFalse(calendarSyncSent, 'syncs calendars');
            assert.deepEqual(calendarSyncError, [err]);
          });
        });
      });
    });

  });

});
