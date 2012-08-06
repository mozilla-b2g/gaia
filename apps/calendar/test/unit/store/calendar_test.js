requireApp('calendar/test/unit/helper.js', function() {
  requireLib('responder.js');
  requireLib('db.js');

  requireLib('provider/local.js');

  requireLib('models/calendar.js');
  requireLib('models/account.js');

  requireLib('store/abstract.js');
  requireLib('store/calendar.js');
});

suite('store/calendar', function() {

  var subject;
  var db;
  var model;
  var app;

  setup(function(done) {
    this.timeout(5000);

    db = testSupport.calendar.db();
    app = testSupport.calendar.app();

    subject = db.getStore('Calendar');

    model = {
      _id: 1,
      remote: { id: 'uuid' },
      accountId: 'acc1'
    };

    db.open(function(err) {
      assert.ok(!err);
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
    var trans = db.transaction('events', 'readwrite');
    var accounts = trans.objectStore('events');
    var res = accounts.clear();

    res.onerror = function() {
      done(new Error('could not wipe events db'));
    }

    res.onsuccess = function() {
      done();
    }
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

  test('#_assignId', function(done) {
    var cal = Factory.build('calendar', {
      accountId: 1,
      remote: { id: 'uuid' }
    });

    subject.persist(cal, function(err, id, obj) {
      done(function() {
        assert.equal(
          id,
          '1-uuid',
          'should assign id'
        );

        assert.equal(
          obj._id,
          id
        );
      });
    });
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

  suite('#sync', function() {

    var events;
    var account;
    var calendar;
    var eventStore;

    setup(function() {
      account = Factory('account', {
        providerType: 'Local'
      });

      eventStore = subject.db.getStore('Event');

      calendar = Factory('calendar', {
        _id: 1,
        lastEventSyncToken: null,
        remote: { syncToken: 'synced' }
      });

      events = {
        add: [
          Factory('event', {
            calendarId: 1,
            _type: 'add',
            remote: { title: 'add me', syncToken: '1-1' }
          })
        ],

        remove: [
          Factory('event', {
            _type: 'remove',
            calendarId: 1,
            removeThisGuy: true,
            remote: { title: 'remove me!', syncToken: '77' }
          })
        ],

        same: [
          Factory('event', {
            _type: 'same',
            calendarId: 1,
            remote: { title: 'same', syncToken: 'neverchanged' }
          })
        ],

        update: [
          Factory('event', {
            _type: 'update',
            calendarId: 1,
            remote: {
              title: 'update',
              syncToken: 'orig'
            }
          })
        ]
      };
    });

    setup(function(done) {
      subject.persist(calendar, done);
    });

    setup(function(done) {
      eventStore.persist(events.remove[0], done);
    });

    setup(function(done) {
      eventStore.persist(events.same[0], done);
    });

    setup(function(done) {
      eventStore.persist(events.update[0], done);
    });

    setup(function(done) {
      // clear the event cache
      eventStore._cached = Object.create(null);
      eventStore._eventsByTime = Object.create(null);
      eventStore._times = [];
      eventStore._cachedSpan = null;

      eventStore.load(done);
    });

    var providerCall;
    var realProviderStream;
    var stream;
    var provider;
    var firedEvent;

    function getId(obj) {
      var id;
      if (obj._id) {
        id = obj._id;
      } else {
        id = obj.calendarId + '-' + obj.remote.id;
      }

      return id;
    }

    function watchEvent(eventName) {
      eventStore.on(eventName, function() {
        if (!(eventName in firedEvent)) {
          firedEvent[eventName] = [];
        }
        firedEvent[eventName].push(arguments);
      });
    }

    setup(function() {

      stream = new Calendar.Responder();
      stream.send = function(cb) {
        stream.sendCb = cb;
      }

      provider = app.provider(
        account.providerType
      );

      realProviderStream = provider.eventStream;
      provider.eventStream = function() {
        providerCall = arguments;
        return stream;
      };
    });

    teardown(function() {
      provider.eventStream = realProviderStream;
    });

    setup(function(done) {
      firedEvent = {};
      watchEvent('remove');
      watchEvent('add');
      watchEvent('update');

      subject.sync(account, calendar, function() {
        done();
      });

      stream.emit(
        'data',
        events.add[0].remote
      );

      events.update[0].remote.syncToken = 'newsync';

      stream.emit(
        'data',
        events.update[0].remote
      );

      stream.emit(
        'data',
        events.same[0].remote
      );

      stream.sendCb(null);
    });

    test('called remote', function() {
      assert.deepEqual(
        providerCall[0],
        account.toJSON()
      );

      assert.deepEqual(
        providerCall[1]._id,
        calendar._id
      );

      assert.equal(firedEvent.remove.length, 1);
      assert.equal(firedEvent.add.length, 1);
      assert.equal(firedEvent.update.length, 1);

      assert.equal(
        firedEvent.remove[0][0],
        events.remove[0]._id
      );

      assert.equal(
        firedEvent.add[0][0],
        events.add[0]._id
      );

      assert.equal(
        firedEvent.update[0][0],
        events.update[0]._id
      );

      var removeId = getId(events.remove[0]);
      var addId = getId(events.add[0]);
      var updateId = getId(events.update[0]);
      var sameId = getId(events.same[0]);

      assert.ok(!eventStore.cached[removeId]);
      assert.ok(eventStore.cached[addId]);
      assert.ok(eventStore.cached[updateId]);
      assert.ok(eventStore.cached[sameId]);

      assert.equal(
        eventStore.cached[updateId].remote.syncToken,
        'newsync'
      );

      var savedCal = subject.cached[calendar._id];

      assert.equal(
        savedCal.lastEventSyncToken,
        calendar.remote.syncToken
      );

      assert.instanceOf(
        savedCal.lastEventSyncDate,
        Date
      );
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
        done(function() {
          assert.ok(!subject.cached[id]);

          var keys = Object.keys(eventStore.cached);
          assert.equal(keys.length, 1);
        });
      });
    });
  });


});
