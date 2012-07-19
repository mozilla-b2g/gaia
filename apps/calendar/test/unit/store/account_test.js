requireApp('calendar/test/unit/helper.js', function() {
  testSupport.calendar.requireProvider();

  requireLib('db.js');
  requireLib('models/account.js');
  requireLib('store/abstract.js');
  requireLib('store/account.js');
});

suite('store/account', function() {

  var subject, db;

  setup(function(done) {
    db = testSupport.calendar.db();
    subject = db.getStore('Account');

    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  teardown(function(done) {
    var trans = db.transaction('accounts', 'readwrite');
    var accounts = trans.objectStore('accounts');
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
    assert.equal(subject.db, db);
    assert.deepEqual(subject._cached, {});
  });

  suite('#load', function() {
    var ids = [];
    var all;
    var result;
    var eventFired;

    suiteSetup(function() {
      ids.length = 0;
    });

    function add() {
      setup(function(done) {
        subject.persist({ providerType: 'Local' }, function(err, id) {
          ids.push(id.toString());

          done();
        });
      });
    }

    add();
    add();

    setup(function(done) {
      eventFired = null;
      subject.once('load', function(data) {
        eventFired = data;
      });

      // wipe out _cached beforehand
      // so not to confuse add's caching
      // with alls
      subject._cached = {};
      subject.load(function(err, data) {
        if (err) {
          return done(err);
        }
        result = data;
        // HACK - required
        // so the state of this test
        // actually is in the next tick.
        setTimeout(function() {
          done();
        }, 0);
      });
    });

    test('result', function() {
      var keys = Object.keys(result);
      var key;

      assert.deepEqual(
        keys.sort(),
        ids.sort()
      );

      assert.equal(eventFired, subject._cached);

      for (key in result) {
        var obj = result[key];

        assert.ok(subject._cached[key]);
        assert.instanceOf(subject._cached[key], Calendar.Models.Account);
        assert.ok(obj._id);
        assert.instanceOf(obj, Calendar.Models.Account);
        assert.equal(obj.providerType, 'Local');
      }
    });
  });

  test('#presetActive', function() {
    subject._cached[1] = { preset: 'A' };

    assert.isTrue(subject.presetActive('A'));
    assert.isFalse(subject.presetActive('B'));
  });

  test('#cached', function() {
    assert.equal(subject.cached, subject._cached);
  });

});
