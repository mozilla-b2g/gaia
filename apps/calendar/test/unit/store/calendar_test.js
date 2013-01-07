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
      // setup fixtures
      eventStore = subject.db.getStore('Event');
      events = {};

      // transaction for initial creation of records.
      var trans = subject.db.transaction(
        subject._dependentStores,
        'readwrite'
      );

      // setup calendars
      model = Factory('calendar', { accountId: 1 });
      subject.persist(model, trans);

      // setup events
      events[1] = Factory('event', { calendarId: model._id });
      events[2] = Factory('event', { calendarId: 'some-other' });

      // we will eventually remove this record.
      eventStore.persist(events[1], trans);

      // this is our control to ensure
      // we are not removing extra stuff
      eventStore.persist(events[2], done);

      trans.addEventListener('complete', function() {
        done();
      });
    });

    setup(function(done) {
      subject.remove(model._id, function() {
        eventStore.count(function(err, count) {
          assert.equal(count, 1);
          done();
        });
      });
    });

    test('after remove', function(done) {
      eventStore.get(events[1]._id, function(err, result) {
        done(function() {
          assert.ok(!result);
        });
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
