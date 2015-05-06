define(function(require) {
'use strict';

var AccountCreation = require('utils/account_creation');
var Factory = require('test/support/factory');
var Responder = require('common/responder');
var core = require('core');

suite('Utils.AccountCreation', function() {
  var subject;
  var accountStore;
  var calendarStore;

  var account;
  var provider;

  setup(function(done) {
    accountStore = core.storeFactory.get('Account');
    calendarStore = core.storeFactory.get('Calendar');

    subject = new AccountCreation();

    provider = core.providerFactory.get('Mock');
    account = Factory('account', {
      user: 'special',
      providerType: 'Mock'
    });

    core.db.open(done);
  });

  teardown(function() {
    accountStore._clearCache();
    calendarStore._clearCache();
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      core.db,
      ['accounts', 'calendars'],
      function() {
        core.db.close();
        done();
      }
    );
  });

  test('initialization', function() {
    assert.instanceOf(subject, Responder);
  });

  suite('#send - success', function() {

    // sync capture setup
    var onAccountSync;
    var calendarSyncs;
    var accountSync;
    var calendarSync;

    setup(function() {
      onAccountSync = null;
      calendarSyncs = {};

      calendarSync = calendarStore.sync;
      calendarStore.sync = function(givenAccount, calendar) {
        assert.equal(givenAccount.user, account.user);
        calendarSyncs[calendar.remote.id] = calendar.remote;
      };

      accountSync = accountStore.sync;
      accountStore.sync = function(model, callback) {
        accountSync.call(this, model, function() {
          if (onAccountSync) {
            onAccountSync(model, Array.slice(arguments));
          }
          callback.apply(this, arguments);
        });
      };
    });

    teardown(function() {
      accountStore.sync = accountSync;
      calendarStore.sync = calendarSync;
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

});
