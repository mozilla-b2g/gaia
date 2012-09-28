requireApp('calendar/test/unit/helper.js', function() {
  requireLib('responder.js');
  requireLib('db.js');

  requireLib('provider/local.js');
  requireLib('provider/caldav.js');

  requireLib('models/calendar.js');
  requireLib('models/account.js');

  requireLib('store/abstract.js');
  requireLib('store/calendar.js');
});

suite('store/calendar', function() {

  var subject;
  var db;
  var model;
  var account;
  var app;

  setup(function(done) {
    this.timeout(5000);

    db = testSupport.calendar.db();
    app = testSupport.calendar.app();

    var accountStore = db.getStore('Account');

    subject = db.getStore('Calendar');

    account = accountStore.cached.acc1 = {
      _id: 'acc1',
      providerType: 'Local'
    };

    model = {
      _id: 1,
      remote: { id: 'uuid' },
      accountId: 'acc1'
    };

    db.open(function(err) {
      done();
    });
  });

  teardown(function(done) {
    var trans = db.transaction('calendars', 'readwrite');
    var accounts = trans.objectStore('calendars');
    var res = accounts.clear();

    res.onerror = function() {
      done(new Error('could not wipe accounts db'));
    }

    res.onsuccess = function() {
      done();
    }
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      db,
      ['accounts', 'calendars'],
      done
    );
  });

  teardown(function() {
    db.close();
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.Store.Abstract);
    assert.equal(subject._store, 'calendars');
    assert.equal(subject.db, db);

    assert.ok(subject._remoteByAccount);
  });

  suite('cache handling', function() {
    setup(function() {
      subject._addToCache(model);
    });

    test('#_addToCache', function() {
      assert.equal(subject._cached[1], model);
      assert.equal(
        subject._remoteByAccount['acc1']['uuid'],
        model
      );
    });

    test('#_removeFromCache', function() {
      subject._removeFromCache(1);
      assert.ok(!subject._cached[1]);
      assert.ok(!subject._remoteByAccount['acc1']['uuid']);
    });

  });

  suite('#persist', function() {
    test('error case', function(done) {
      var sample = Factory.create('calendar');

      subject.persist(sample, function(err, data) {
        done();
      });
    });
  });

  suite('#_createModel', function() {
    var remote = {};

    test('with id', function() {
      var result = subject._createModel({
        remote: remote
      }, 'id');

      assert.equal(result.remote, remote);
      assert.equal(result._id, 'id');
      assert.instanceOf(result, Calendar.Models.Calendar);
    });

    test('without id', function() {
      var result = subject._createModel({
        remote: remote
      });

      assert.equal(result.remote, remote);
      assert.isFalse(('_id' in result));
    });
  });

  test('#remotesByAccount', function() {
    subject._addToCache(model);

    var result = subject.remotesByAccount(
      model.accountId
    );

    assert.deepEqual(result, {
      'uuid': model
    });
  });

  suite('#sync - provider skip', function() {
   var account, calendar;

    setup(function() {
      account = Factory('account', {
        providerType: 'Local'
      });

      calendar = Factory('calendar', {
        _id: 1,
        lastEventSyncToken: null,
        remote: { syncToken: 'synced' }
      });

    });

    setup(function(done) {
      subject.db.getStore('Account').persist(account, done);
    });

    setup(function(done) {
      subject.persist(calendar, done);
    });

    test('result', function(done) {
      // should not sync because local cannot sync
      subject.sync(account, calendar, function() {
        done();
      });
    });

  });

  suite('#remove', function() {
    var eventStore;
    var model;
    var events;

    setup(function(done) {
      events = {};
      model = subject._createModel({
        accountId: 1
      });

      subject.persist(model, done);
      eventStore = subject.db.getStore('Event');
    });

    setup(function(done) {
      assert.ok(model._id);
      // we will eventually remove this
      events[1] = Factory('event', {
        calendarId: model._id,
        remote: { title: 'foo' }
      });

      eventStore.persist(events[1], done);
    });

    setup(function(done) {
      events[2] = Factory('event', {
        calendarId: 'some-other'
      });

      // this is our control to ensure
      // we are not removing extra stuff
      eventStore.persist(events[2], done);
    });

    test('removal', function(done) {
      var id = model._id;
      var keys = Object.keys(eventStore.cached);
      // make sure records are still here
      assert.equal(keys.length, 2);

      subject.remove(model._id, function() {
        // wait until next tick
        setTimeout(function() {
          done(function() {
            assert.ok(!subject.cached[id]);

            var keys = Object.keys(eventStore.cached);
            assert.equal(keys.length, 1);
          });
        }, 0);
      });
    });
  });

  test('#providerFor', function() {
    account.providerType = 'Local';
    assert.equal(
      subject.providerFor(model),
      app.provider('Local')
    );
  });

  suite('#findWithCapability', function() {
    var abstractAccount;
    var localAccount;

    var localCal;
    var absCal;

    setup(function(done) {
      var trans = subject.db.transaction(
        ['accounts', 'calendars'],
        'readwrite'
      );

      trans.addEventListener('complete', function() {
        done();
      });

      abstractAccount = Factory('account', {
        _id: 'abstract',
        providerType: 'Abstract'
      });

      localAccount = Factory('account', {
        _id: 'local',
        providerType: 'Local'
      });

      localCal = Factory('calendar', {
        accountId: localAccount._id
      });

      absCal = Factory('calendar', {
        accountId: abstractAccount._id
      });

      var account = db.getStore('Account');

      account.persist(abstractAccount, trans);
      account.persist(localAccount, trans);
      subject.persist(localCal, trans);
      subject.persist(absCal, trans);
    });

    var caps = ['createEvent', 'deleteEvent', 'updateEvent'];

    caps.forEach(function(name) {
      test('find: ' + name, function() {
        var result = subject.findWithCapability(name);
        assert.length(result, 1);
        assert.equal(result[0], localCal);
      });
    });

  });

});
