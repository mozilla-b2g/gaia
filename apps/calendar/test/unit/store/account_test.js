requireLib('db.js');
requireLib('models/account.js');
requireLib('models/calendar.js');
requireLib('store/abstract.js');
requireLib('store/account.js');

suite('store/account', function() {

  ['Provider.Local', 'Provider.Caldav'].forEach(function(name) {
    suiteSetup(function(done) {
      Calendar.App.loadObject(name, done);
    });
  });

  var subject;
  var db;
  var app;

  setup(function(done) {
    this.timeout(5000);
    app = testSupport.calendar.app();
    db = app.db;
    subject = db.getStore('Account');

    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      subject.db,
      ['accounts', 'calendars'],
      done
    );
  });

  teardown(function() {
    db.close();
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.Store.Abstract);
    assert.equal(subject.db, db);
    assert.deepEqual(subject._cached, {});
  });

  suite('#markWithError', function() {
    var errEvent;
    var accounts = testSupport.calendar.dbFixtures(
      'account',
      'Account', {
        one: { _id: 55, providerType: 'Mock' }
      }
    );

    var calendars = testSupport.calendar.dbFixtures(
      'calendar',
      'Calendar', {
        one: { _id: 'one', accountId: 55 },
        two: { _id: 'two', accountId: 55 }
      }
    );

    var model;
    setup(function() {
      model = accounts.one;
    });

    suite('marking error', function() {
      var error;
      setup(function(done) {
        error = new Calendar.Error.Authentication();
        subject.markWithError(model, error, done);
      });

      function markedWithError(expectedCount) {
        expectedCount = expectedCount || 1;
        test('after erorr mark #' + expectedCount, function(done) {
          subject.get(model._id, function(getErr, result) {
            done(function() {
              assert.ok(!getErr, 'is successful');
              assert.equal(result.error.count, expectedCount, 'has count');
              assert.equal(
                result.error.name,
                error.name,
                'model is marked with error'
              );

              assert.instanceOf(
                result.error.date,
                Date,
                'has date of occurrence'
              );
            });
          });
        });
      }

      markedWithError(1);

      suite('second mark', function() {
        setup(function(done) {
          subject.markWithError(model, error, done);
        });

        markedWithError(2);
      });
    });

    suite('dependant calendars', function() {
      var err;
      setup(function(done) {
        err = new Calendar.Error.Authentication();
        subject.markWithError(model, err, done);
      });

      function verifyCalendar(key) {
        test('ensure calendar is marked: ' + key, function(done) {
          app.store('Calendar').get(key, function(getErr, result) {
            done(function() {
              assert.ok(result, 'has calendar');
              assert.ok(result.error, 'sets error');
              assert.equal(result.error.name, err.name, 'sets error');
            });
          });
        });
      }

      verifyCalendar('one');
      verifyCalendar('two');
    });
  });

  suite('#availablePresets', function() {
    var presetAccount;
    var presets = {
      'multiUse': {},
      'singleUse': {
        singleUse: true
      }
    };

    test('without single use', function(done) {
      subject.availablePresets({ 'foo': {} }, function(err, available) {
        if (err) {
          done();
        }

        done(function() {
          assert.deepEqual(available, ['foo']);
        });
      });
    });

    test('when single use is available', function(done) {
      subject.availablePresets(presets, function(err, available) {
        if (err) {
          done(err);
        }

        done(function() {
          assert.deepEqual(available, ['multiUse', 'singleUse']);
        });
      });
    });

    suite('when single use is used', function() {
      setup(function(done) {
        // stage account
        presetAccount = Factory('account', {
          preset: 'singleUse'
        });

        subject.persist(presetAccount, done);
      });

      test('exclusion of single use preset', function(done) {
        subject.availablePresets(presets, function(err, available) {
          if (err) {
            return done(err);
          }

          done(function() {
            assert.deepEqual(available, ['multiUse']);
          });
        });
      });
    });

  });

  suite('#verifyAndPersist', function() {
    var error;
    var result;
    var model;
    var calledWith;
    var modelParams;

    setup(function() {
      error = null;
      result = {};

      modelParams = Factory.build('account', {
        providerType: 'Caldav'
      });

      model = new Calendar.Models.Account(modelParams);

      app._providers['Caldav'] = {
        getAccount: function(details, callback) {
          calledWith = details;
          setTimeout(function() {
            callback(error, result);
          }, 0);
        }
      };
    });

    suite('duplicate account failure', function() {
      var existingAccount;
      var existingParams = {
        providerType: 'Caldav',
        user: 'foobar',
        fullUrl: 'http://google.com/foo'
      };

      function sendsDuplicateError(done) {
        return function(err, id, model) {
          done(function() {
            assert.ok(!id, 'is not persisted');
            assert.ok(err, 'sends error on duplicate account');
            assert.equal(err.name, 'account-exist');
          });
        };
      }

      setup(function(done) {
        existingAccount = Factory('account', existingParams);
        subject.persist(existingAccount, done);
      });


      test('initial input is duplicate', function(done) {
        var account = Factory('account', existingParams);

        subject.verifyAndPersist(account, sendsDuplicateError(done));
      });

      test('input is updated to be duplicate', function(done) {
        var account = Factory('account', existingParams);
        account.user = '';

        result = { user: existingParams.user };

        subject.verifyAndPersist(account, sendsDuplicateError(done));
      });

    });


    suite('existing account', function() {
      // setup an account to modify
      setup(function(done) {
        model.error = {};
        subject.persist(model, done);
      });

      // bug 870512
      test('should be able to update', function(done) {
        result = {};
        model.password = 'new';
        subject.verifyAndPersist(model, function(err, data) {
          if (err) {
            return done(err);
          }
          subject.get(model._id, function(getErr, result) {
            if (getErr) {
              return done(err);
            }

            done(function() {
              assert.equal(result.password, 'new', 'updates pass');
              assert.ok(!result.error, 'clears errors');
            });
          });
        });
      });
    });

    // mock out the provider
    test('when verify fails', function(done) {
      error = new Error('bad stuff');
      subject.verifyAndPersist(model, function(err, data) {
        done(function() {
          assert.ok(!data);
          assert.equal(err, error);
          assert.deepEqual(calledWith, model.toJSON());
        });
      });
    });

    test('persist + url change', function(done) {
      result = Factory('caldav.account');

      subject.verifyAndPersist(model, function(err, id, data) {
        done(function() {
          assert.instanceOf(data, Calendar.Models.Account);
          assert.equal(data.domain, result.domain);
          assert.equal(data.entrypoint, result.entrypoint);
          assert.equal(data.calendarHome, result.calendarHome);
        });
      });
    });

    test('persist + oauth change', function(done) {
      model.oauth = { code: 'xxx' };
      result = Factory('caldav.account', {
        oauth: { refresh_token: 'xxx' }
      });

      subject.verifyAndPersist(model, function(err, id, data) {
        done(function() {
          assert.equal(data.oauth, result.oauth);
        });
      });
    });

    test('persist no change', function(done) {
      result = {};

      subject.verifyAndPersist(model, function(err, id, data) {
        done(function() {
          assert.instanceOf(data, Calendar.Models.Account);
          assert.equal(data.domain, modelParams.domain);
          assert.equal(data.calendarHome, modelParams.calendarHome);
        });
      });
    });
  });


  suite('#remove', function() {
    var calStore;
    var model;
    var calendars;

    setup(function(done) {
      calendars = {};
      calStore = subject.db.getStore('Calendar');

      model = subject._createModel({
        providerType: 'Local'
      });

      subject.persist(model, done);
    });

    setup(function(done) {
      assert.ok(model._id);
      // we will eventually remove this
      calendars[1] = new Calendar.Models.Calendar({
        accountId: model._id,
        remote: { id: 777 }
      });

      calStore.persist(calendars[1], done);
    });

    setup(function(done) {
      calendars[2] = new Calendar.Models.Calendar({
        accountId: 'some-other',
        remote: { id: 666 }
      });

      // this is our control to ensure
      // we are not removing extra stuff
      calStore.persist(calendars[2], done);
    });

    suite('removal', function() {
      var id;
      setup(function(done) {
        id = model._id;
        subject.remove(id, done);
      });

      test('removes account', function(done) {
        subject.get(id, function(err, result) {
          done(function() {
            assert.ok(!result, 'removes account');
          });
        });
      });

      test('removes associated calendars', function(done) {
        calStore.all(function(err, calendars) {
          done(function() {
            assert.ok(calendars.accountId != id, 'removes calendars');
          });
        });
      });
    });
  });

  suite('#_createModel', function() {
    test('with id', function() {
      var result = subject._createModel({
        providerType: 'Local'
      }, 'id');

      assert.equal(result.providerType, 'Local');
      assert.equal(result._id, 'id');
      assert.instanceOf(result, Calendar.Models.Account);
    });

    test('without id', function() {
     var result = subject._createModel({
        providerType: 'Local'
      });

      assert.equal(result.providerType, 'Local');
      assert.isFalse(('_id' in result));
    });

  });

  suite('#syncableAccounts', function() {
    var accounts = testSupport.calendar.dbFixtures(
      'account',
      'Account', {
        nosync: { _id: 55, providerType: 'Local' },
        sync: { _id: 56, providerType: 'Caldav' }
      }
    );


    var results;
    setup(function(done) {
      subject.syncableAccounts(function(err, list) {
        if (err) return done(err);
        results = list;
        done();
      });
    });

    test('found accounts', function() {
      assert.length(results, 1);
      assert.equal(results[0]._id, accounts.sync._id);
    });

    suite('no syncable accounts', function() {
      setup(function(done) {
        subject.remove(accounts.sync._id, done);
      });

      test('result', function(done) {
        subject.syncableAccounts(function(err, list) {
          if (err) return done(err);
          assert.equal(list.length, 0);
          done();
        });
      });
    });
  });

  suite('#sync: add, remove, update', function() {
    var remote;
    var events;
    var account;
    var results;
    var calendarStore;
    var cals;
    var remoteCalledWith;

    function watchEvent(eventName) {
      calendarStore.on(eventName, function() {
        if (!(eventName in events)) {
          events[eventName] = [];
        }
        events[eventName].push(arguments);
      });
    }

    setup(function() {
      calendarStore = subject.db.getStore('Calendar');
      account = Factory.create('account', {
        _id: 1,
        providerType: 'Mock'
      });

      cals = {};

      cals.add = Factory('calendar', {
        accountId: account._id,
        remote: { name: 'add' }
      });

      cals.remove = Factory('calendar', {
        accountId: account._id,
        remote: { name: 'remove' }
      });

      cals.update = Factory('calendar', {
        accountId: account._id,
        remote: { name: 'update' },
        error: {}
      });
    });

    setup(function(done) {
      calendarStore.persist(cals.update, done);
    });

    setup(function(done) {
      calendarStore.persist(cals.remove, done);
    });

    setup(function(done) {
      // clear cache
      calendarStore._remoteByAccount = Object.create(null);
      calendarStore._cached = Object.create(null);

      // reload from db
      calendarStore.all(done);
    });

    setup(function(done) {
      events = {};
      remoteCalledWith = null;

      watchEvent('add');
      watchEvent('update');
      watchEvent('remove');

      remote = {};
      remote[cals.update.remote.id] = {
        id: cals.update.remote.id,
        name: 'update!',
        description: 'new desc'
      };

      remote[cals.add.remote.id] = {
        id: cals.add.remote.id,
        name: 'new item'
      };

      app.provider('Mock').stageFindCalendars(
        account.user,
        null,
        remote
      );

      subject.sync(account, function(err) {
        if (err) {
          return done(err);
        }
        done();
      });
    });

    var syncResults;

    setup(function(done) {
      calendarStore.remotesByAccount(account._id, function(err, list) {
        done(function() {
          syncResults = list;
        });
      });
    });

    test('after sync', function() {
      assert.equal(
        Object.keys(syncResults).length, 2,
        'should only have two records'
      );

      // EVENTS
      assert.ok(events.remove[0][0]);

      var updateObj = events.update[0][1].remote;

      assert.equal(
        updateObj.id,
        cals.update.remote.id
      );

      var addObj = events.add[0][1].remote;

      assert.equal(
        addObj.id,
        cals.add.remote.id
      );

      var remoteUpdate = syncResults[cals.update.remote.id];
      var remoteAdd = syncResults[cals.add.remote.id];

      // update
      assert.instanceOf(
        remoteUpdate,
        Calendar.Models.Calendar,
        'should update cache'
      );

      assert.ok(!remoteUpdate.error, 'removes error');

      assert.equal(
        remoteUpdate.remote.description,
        'new desc',
        'should update changed descripton'
      );

      assert.equal(
        remoteUpdate.name,
        'update!',
        'should update changed name'
      );

      // add
      assert.instanceOf(
        remoteAdd,
        Calendar.Models.Calendar,
        'should add new calendar'
      );

      assert.equal(
        remoteAdd.name,
        'new item',
        'should use remote data when creating new calendar'
      );
    });

  });

});
