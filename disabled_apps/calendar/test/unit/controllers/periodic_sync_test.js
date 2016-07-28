/**
 * TODO(gareth): It would be really wonderful for the interactions
 *     with the account store to be real (not stubbed) but there
 *     is currently some bizarreness around testSupport.calendar.dbFixtures
 *     which needs to be addressed first.
 */
define(function(require) {
'use strict';

var createDOMPromise = require('common/create_dom_promise');
var mockAlarms = require('test/support/mock_alarms');
var periodicSync = require('controllers/periodic_sync');

suite('controllers/periodic_sync', function() {
  var db, storeFactory;

  setup(function(done) {
    mockAlarms.setup();
    var core = testSupport.calendar.core();
    db = core.db;
    storeFactory = core.storeFactory;
    db.open(done);
  });

  teardown(function() {
    mockAlarms.teardown();
    db.close();
  });

  test('mozAlarms mock', function(done) {
    mockAlarms.add(new Date(), 'ignoreTimezone', { type: 'sync' });
    createDOMPromise(mockAlarms.getAll())
      .should
      .eventually
      .have
      .length(1)
      .notify(done);
  });

  suite('periodic sync', function() {
    var settings;

    setup(function(done) {
      settings = storeFactory.get('Setting');
      settings.set('syncFrequency', 1).then(() => done());
    });

    setup(function(done) {
      periodicSync.observe().then(() => done());
    });

    teardown(function() {
      settings._clearCache();
    });

    teardown(function(done) {
      testSupport.calendar.clearStore(db, [ 'settings' ], done);
    });

    teardown(function() {
      periodicSync.unobserve();
    });

    suite('without initial caldav calendar', function() {
      setup(function() {
        var accounts = storeFactory.get('Account');
        sinon.stub(accounts, 'syncableAccounts').returns(Promise.resolve([]));
      });

      teardown(function() {
        var accounts = storeFactory.get('Account');
        accounts.syncableAccounts.restore();
      });

      test('should not schedule sync initially', function(done) {
        createDOMPromise(mockAlarms.getAll())
          .should
          .eventually
          .have
          .length(0)
          .notify(done);
      });
    });

    suite('with initial caldav calendar', function() {
     setup(function() {
        var accounts = storeFactory.get('Account');
        sinon.stub(accounts, 'syncableAccounts').returns(Promise.resolve([
          { _id: 'one', providerType: 'Caldav' }
        ]));
     });

      setup(function(done) {
        periodicSync.events.once('schedule', () => done());
        var accounts = storeFactory.get('Account');
        accounts.emit('persist');
      });

     teardown(function() {
       var accounts = storeFactory.get('Account');
       accounts.syncableAccounts.restore();
     });

      test('should schedule sync initially', function(done) {
        createDOMPromise(mockAlarms.getAll())
          .should
          .eventually
          .have
          .length(1)
          .notify(done);
      });

      test('sync interval change revokes previous alarm', function(done) {
        var first;

        periodicSync.events.once('schedule', () => {
          var getAll = createDOMPromise(mockAlarms.getAll());
          getAll.then(result => {
            assert.lengthOf(result, 1);
            var alarm = result[0];
            assert.notStrictEqual(alarm.alarmId, first);
            done();
          });
        });

        var getAll = createDOMPromise(mockAlarms.getAll());
        getAll.then(result => {
          var alarm = result[0];
          first = alarm.alarmId;
          var settings = storeFactory.get('Setting');
          settings.set('syncFrequency', 2);
        });
      });

      test('removing last caldav account should stop sync', function(done) {
        periodicSync.events.on('pause', () => {
          var getAll = createDOMPromise(mockAlarms.getAll());
          getAll.then(result => {
            assert.lengthOf(result, 0);
            done();
          });
        });

        var accounts = storeFactory.get('Account');
        accounts.syncableAccounts.restore();
        sinon.stub(accounts, 'syncableAccounts').returns(Promise.resolve([]));
        accounts.emit('remove');
      });
    });
  });
});

});
