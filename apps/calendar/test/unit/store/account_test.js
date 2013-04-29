requireLib('db.js');
requireLib('models/account.js');
requireLib('models/calendar.js');
requireLib('store/abstract.js');
requireLib('store/account.js');

suite('store/account', function() {

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
      result = null;

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
        remote: { name: 'update' }
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
