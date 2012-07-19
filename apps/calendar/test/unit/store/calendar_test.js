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

  var subject, db;

  setup(function(done) {
    db = testSupport.calendar.db();
    subject = db.getStore('Calendar');

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

    assert.ok(subject._remoteCache);
    assert.ok(subject._accountMap);
  });

  suite('cache handling', function() {
    var model;
    setup(function() {
      model = {
        _id: 1,
        remote: { id: 'uuid' },
        accountId: 'acc1'
      };

      subject._addToCache(model);
    });

    test('#_addToCache', function() {
      assert.equal(subject._cached[1], model);
      assert.equal(subject._remoteCache['uuid'], model);
      assert.equal(
        subject._accountMap['acc1'][1],
        model
      );
    });

    test('#_removeFromCache', function() {
      subject._removeFromCache(1);
      assert.ok(!subject._cached[1]);
      assert.ok(!subject._remoteCache['uuid']);
      assert.ok(!subject._accountMap['acc1'][1]);
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

});
