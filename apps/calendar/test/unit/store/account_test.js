requireApp('calendar/test/unit/helper.js', function() {
  testSupport.calendar.requireProvider();

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

  function add(object) {
    setup(function(done) {
      var store = subject.db.getStore('Calendar');
      var model = store._createModel(object);
      store.once('persist', function() {
        done();
      });
      store.persist(model);
    });
  }

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
    testSupport.calendar.clearStore('accounts', done);
    subject._cached = {};
  });

  teardown(function(done) {
    testSupport.calendar.clearStore('calendars', done);
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
    var modelParams = {
      providerType: 'Caldav',
      user: 'foo',
      password: 'bar',
      domain: 'domain',
      url: 'url'
    };

    setup(function() {
      error = null;
      result = null;

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
      result = {
        domain: 'new domain',
        url: 'new url'
      };

      subject.verifyAndPersist(model, function(err, id, data) {
        done(function() {
          assert.instanceOf(data, Calendar.Models.Account);
          assert.equal(data.domain, result.domain);
          assert.equal(data.url, result.url);
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
          assert.equal(data.url, modelParams.url);
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
        done(function() {
          assert.ok(!subject.cached[id]);

          var keys = Object.keys(calStore.cached);
          var accountKeys = Object.keys(
            calStore.remotesByAccount(id)
          );

          assert.equal(accountKeys.length, 0);
          assert.equal(keys.length, 1);
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
    var model;
    var results;
    var store;
    var remoteCalledWith;

    add({ accountId: 6, remote: { id: 1, name: 'remove' } });
    add({ accountId: 6, remote: { id: 2, name: 'update' } });

    setup(function() {
      remoteCalledWith = null;
      model = new Calendar.Models.Account({
        providerType: 'Local',
        _id: 6
      });

      remote = {};

      remote[2] = {
        id: 2,
        name: 'update!',
        description: 'new desc'
      };

      remote[3] = {
        id: 3,
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
    });

    setup(function(done) {
      store = subject.db.getStore('Calendar');
      events = {
        add: [],
        remove: [],
        update: []
      };

      store.on('add', function() {
        events.add.push(arguments);
      });

      store.on('update', function() {
        events.update.push(arguments);
      });

      store.on('remove', function() {
        events.remove.push(arguments);
      });

      subject.sync(model, function() {
        done();
      });
    });

    setup(function(done) {
      var store = subject.db.getStore('Calendar');
      store.load(function(err, data) {
        results = data;
        done();
      });
    });

    test('after sync', function() {
      var byRemote = {};
      assert.equal(Object.keys(results).length, 2);
      assert.deepEqual(remoteCalledWith[0], model.toJSON());

      // re-index all records by remote
      Object.keys(results).forEach(function(key) {
        var obj = results[key];
        byRemote[obj.remote.id] = obj;
      });

      // EVENTS
      assert.ok(events.remove[0][0]);

      var updateObj = events.update[0][1].remote;
      assert.equal(updateObj.id, '2');

      var addObj = events.add[0][1].remote;
      assert.equal(addObj.id, '3');

      // update
      assert.instanceOf(byRemote[2], Calendar.Models.Calendar);
      assert.equal(byRemote[2].remote.description, 'new desc');
      assert.equal(byRemote[2].name, 'update!');

      // add
      assert.instanceOf(byRemote[3], Calendar.Models.Calendar);
      assert.equal(byRemote[3].name, 'new item');
    });

  });

});
