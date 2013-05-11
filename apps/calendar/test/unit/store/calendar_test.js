requireLib('responder.js');
requireLib('db.js');

requireLib('models/calendar.js');
requireLib('models/account.js');

requireLib('store/abstract.js');
requireLib('store/calendar.js');

suite('store/calendar', function() {


  var subject;
  var db;
  var model;
  var app;

  setup(function(done) {
    this.timeout(5000);

    app = testSupport.calendar.app();
    db = app.db;

    var accountStore = db.getStore('Account');

    subject = db.getStore('Calendar');

    model = Factory('calendar', {
      _id: 1,
      remote: { id: 'uuid' },
      accountId: 'acc1'
    });

    db.open(function(err) {
      done();
    });
  });

  testSupport.calendar.accountEnvironment();
  testSupport.calendar.loadObjects(
    'Provider.Local',
    'Provider.Caldav'
  );

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
  });

  suite('cache handling', function() {
    setup(function() {
      subject._addToCache(model);
    });

    test('#_addToCache', function() {
      assert.equal(subject._cached[1], model);
    });

    test('#_removeFromCache', function() {
      subject._removeFromCache(1);
      assert.ok(!subject._cached[1]);
    });
  });

  suite('#markWithError', function() {
    var calendar;

    setup(function(done) {
      calendar = Factory('calendar');
      subject.persist(calendar, done);
    });

    test('success', function(done) {
      var err = new Calendar.Error.Authentication();
      subject.markWithError(calendar, err, function(markErr) {
        assert.ok(!markErr);
        subject.get(calendar._id, function(getErr, result) {
          done(function() {
            assert.ok(result.error, 'has error');
            assert.equal(result.error.name, err.name, 'set error');
          });
        });
      });
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

  suite('#remotesByAccount', function() {
    var expected;
    var models = testSupport.calendar.dbFixtures('calendar', 'Calendar', {
      one: { accountId: 1, remote: { id: 'one' } },
      two: { accountId: 1, remote: { id: 'two' } },
      three: { accountId: 2, remote: { id: 'three' } }
    });

    setup(function(done) {
      subject.persist(model, done);
    });

    function verify(accountId, done) {
      subject.remotesByAccount(accountId, function(err, list) {
        if (err) {
          done(err);
        }

        done(function() {
          var expectedIds = Object.keys(expected).sort();
          assert.deepEqual(
            Object.keys(list).sort(),
            expectedIds,
            'has same keys'
          );

          expectedIds.forEach(function(id) {
            assert.hasProperties(
              expected[id],
              list[id],
              id
            );
          });
        });
      });
    }

    test('one calendar', function(done) {
      expected = {
        three: models.three
      };

      verify(2, done);
    });

    test('no calendars', function(done) {
      expected = {};

      verify(3, done);
    });

    test('multiple calendars', function(done) {
      expected = {
        one: models.one,
        two: models.two
      };

      verify(1, done);
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

  suite('#ownersOf', function() {

    test('given an id', function(done) {
      var id = this.calendar._id;
      subject.ownersOf(id, function(err, owners) {
        done(function() {
          assert.instanceOf(owners.calendar, Calendar.Models.Calendar);
          assert.instanceOf(owners.account, Calendar.Models.Account);

          assert.equal(owners.calendar._id, this.calendar._id, 'calendar id');
          assert.equal(owners.account._id, this.account._id, 'account id');
        }.bind(this));
      }.bind(this));
    });

  });


  test('#providerFor', function(done) {
    subject.providerFor(this.calendar, function(err, provider) {
      done(function() {
        assert.equal(provider, app.provider('Mock'));
      });
    });
  });

});
