requireApp('calendar/test/unit/helper.js', function() {
  requireLib('db.js');
  requireLib('models/account.js');
  requireLib('models/calendar.js');
  requireLib('store/abstract.js');
  requireLib('store/account.js');
});

suite('store/account', function() {

  var subject;
  var db;
  var app;

  setup(function(done) {
    this.timeout(5000);
    app = testSupport.calendar.app();
    db = testSupport.calendar.db();
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

  test('#presetActive', function() {
    subject._cached[1] = { preset: 'A' };

    assert.isTrue(subject.presetActive('A'));
    assert.isFalse(subject.presetActive('B'));
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
          assert.equal(subject.cached[id], data);
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
          assert.equal(subject.cached[id], data);
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

    test('removal', function(done) {
      var id = model._id;
      var keys = Object.keys(calStore.cached);
      // make sure records are still here
      assert.equal(keys.length, 2);

      subject.remove(model._id, function() {
        // wait for next tick so other callbacks fire
        setTimeout(function() {
          done(function() {
            assert.ok(!subject.cached[id]);

            var keys = Object.keys(calStore.cached);
            var accountKeys = Object.keys(
              calStore.remotesByAccount(id)
            );

            assert.equal(accountKeys.length, 0);
            assert.equal(keys.length, 1);
          });
        }, 0);
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
    var store;
    var cals;
    var remoteCalledWith;

    function watchEvent(eventName) {
      store.on(eventName, function() {
        if (!(eventName in events)) {
          events[eventName] = [];
        }
        events[eventName].push(arguments);
      });
    }

    setup(function() {
      store = subject.db.getStore('Calendar');
      account = Factory.create('account', {
        _id: 1
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
      store.persist(cals.update, done);
    });

    setup(function(done) {
      store.persist(cals.remove, done);
    });

    setup(function(done) {
      // clear cache
      store._remoteByAccount = Object.create(null);
      store._cached = Object.create(null);

      // reload from db
      store.load(done);
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

      app._providers['Local'] = {
        findCalendars: function(account, cb) {
          remoteCalledWith = arguments;
          setTimeout(function() {
            cb(null, remote);
          }, 0);
        }
      };

      subject.sync(account, function() {
        done();
      });
    });

    test('after sync', function() {
      var byRemote = {};
      var results = store.cached;

      assert.equal(
        Object.keys(results).length, 2,
        'should only have two records'
      );

      assert.deepEqual(
        remoteCalledWith[0], account.toJSON(),
        'should send jsonified account'
      );

      // re-index all records by remote
      Object.keys(results).forEach(function(key) {
        var obj = results[key];
        byRemote[obj.remote.id] = obj;
      });

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

      var remoteUpdate = byRemote[cals.update.remote.id];
      var remoteAdd = byRemote[cals.add.remote.id];

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
