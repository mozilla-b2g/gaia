requireApp('calendar/test/unit/helper.js', function() {
  requireLib('responder.js');
  requireLib('db.js');

  requireLib('provider/calendar/abstract.js');
  requireLib('provider/calendar/local.js');
  requireLib('provider/local.js');

  requireLib('models/calendar.js');
  requireLib('store/abstract.js');
  requireLib('store/calendar.js');
});

suite('store/calendar', function() {

  var subject;
  var db;
  var model;

  setup(function(done) {
    db = testSupport.calendar.db();
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
      var sample = {
        remote: {
          id: 'local-first',
          url: '',
          name: 'your_device',
          color: '',
          description: '',
          syncToken: '',
          updatedAt: '',
          createdAt: '',
          calendarType: 'Local'
        },
        localDisplayed: true,
        lastEventSyncDate: '',
        lastEventSyncToken: ''
      };

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

});
