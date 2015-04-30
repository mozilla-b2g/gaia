define(function(require) {
'use strict';

var CalendarError = require('common/error');
var Factory = require('test/support/factory');
var SyncController = require('controllers/sync');
var core = require('core');
var nextTick = require('common/next_tick');

suite('Controllers.Sync', function() {
  var account;
  var calendar;
  var event;

  var subject;
  var db;

  var accModel;

  setup(function(done) {
    db = core.db;
    subject = new SyncController();

    var storeFactory = core.storeFactory;
    calendar = storeFactory.get('Calendar');
    account = storeFactory.get('Account');
    event = storeFactory.get('Event');

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
    assert.equal(subject.pending, 0);
  });

  test('sync all, no accounts', function(done) {
    subject.once('syncComplete', done);
    subject.all();
  });

  test('sync all, no accounts with callback', function(done) {
    subject.all(done);
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

    test('sync account', function(done) {
      var calledModels = [];
      var pending = 2;

      function complete() {
        list.forEach(function(item, idx) {
          assert.hasProperties(item, calledModels[idx]);
        });
       }

      subject.account = function(model) {
        calledModels.push(model);
        if (!--pending) {
          done(complete);
        }
      };
      subject.all();
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

      var err;

      setup(function() {
        err = new CalendarError();
        account.sync = function() {
          var args = Array.slice(arguments);
          var cb = args.pop();
          nextTick(cb.bind(this, err));
        };
      });

      teardown(function() {
        delete account.sync;
        delete core.errorController.dispatch;
      });

      test('error without a callback', function(done) {
        core.errorController.dispatch = function(given) {
          done(function() {
            assert.equal(subject.pending, 0);
            assert.equal(err, given);
          });
        };

        assert.equal(subject.pending, 0);
        subject.account(accModel);
        assert.equal(subject.pending, 1);
      });

      test('error with a callback', function(done) {
        subject.account(accModel, function(givenErr) {
          done(function() {
            assert.equal(givenErr, err, 'sends error');
            assert.equal(subject.pending, 0, 'pending');
          });
        });
      });

      test('success', function(done) {
        var pendingCalendarSync = 2;

        // verify we sync accounts
        account.sync = function(account, callback) {
          assert.equal(account._id, accModel._id);
          assertDoesNotEmit('syncComplete');
          callback();
        };

        var lastCalendar;
        // verify we sync calendars
        calendar.sync = function(acc, calendar, callback) {
          assert.equal(accModel._id, acc._id);
          assert.equal(calendar.accountId, acc._id);

          nextTick(function() {
            callback();
            if (!--pendingCalendarSync) {
              assert.notEqual(lastCalendar._id, calendar._id);
            } else {
              lastCalendar = calendar;
              assertDoesNotEmit('syncComplete');
            }
          });
        };

        subject.account(accModel, function() {
          done(function() {
            assertEmit('syncComplete');
          });
        });
      });
    });

    suite('#calendar', function() {

      test('multiple in progress', function() {
        subject.calendar(accModel, calendars[0]);
        assertEmit('syncStart');
        delete events.syncStart;

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

        assert.lengthOf(calendarSyncCalls, 1, 'emits syncComplete');

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

});
