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
    assert.deepEqual(subject._accounts, {});
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

      // wipe out _accounts beforehand
      // so not to confuse add's caching
      // with alls
      subject._accounts = {};
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

      assert.equal(eventFired, subject._accounts);

      for (key in result) {
        var obj = result[key];

        assert.ok(subject._accounts[key]);
        assert.instanceOf(subject._accounts[key], Calendar.Models.Account);
        assert.ok(obj._id);
        assert.instanceOf(obj, Calendar.Models.Account);
        assert.equal(obj.providerType, 'Local');
      }
    });
  });

  test('#presetActive', function() {
    subject._accounts[1] = { preset: 'A' };

    assert.isTrue(subject.presetActive('A'));
    assert.isFalse(subject.presetActive('B'));
  });

  test('#cached', function() {
    assert.equal(subject.cached(), subject._accounts);
  });

  suite('#get', function() {

    test('missing', function(done) {
      subject.get('foo', function(err, obj) {
        done(function() {
          assert.ok(!obj);
        });
      });
    });

    suite('success', function(done) {
      var id, result;

      setup(function(done) {
        subject.persist({ providerType: 'Local' }, function(err, key) {
          subject._accounts = {};
          if (err) {
            done(new Error('could not add'));
          } else {
            id = key;
            done();
          }
        });
      });

      setup(function(done) {
        subject.get(id, function(err, object) {
          if (err) {
            return done(new Error('could not get'));
          }
          result = object;
          done();
        });
      });

      test('db load', function() {
        assert.instanceOf(
          result,
          Calendar.Models.Account
        );

        assert.equal(result.providerType, 'Local');
        assert.equal(result._id, id);
        assert.equal(subject._accounts[id], result);
      });

      test('cached', function(done) {
        // close db for effect
        subject.get(id, function(err, object) {
          done(function() {
            assert.equal(object, result);
          });
        });
      });

    });

  });

  suite('#add', function() {

    var addEvent;
    var id;
    var object;

    setup(function(done) {
      object = new Calendar.Models.Account(
        { providerType: 'Local' }
      );

      subject.persist(object, function(err, key) {
        id = key;
      });

      subject.once('persist', function(key, value) {
        addEvent = arguments;
        done();
      });
    });

    test('event', function() {
      assert.equal(addEvent[0], id);
      assert.equal(addEvent[1], object);
    });

    test('with an id', function(done) {
      // get cannot be used
      // because it will check for the cached
      // value.
      var trans = subject.db.transaction('accounts');
      var req = trans.objectStore('accounts').get(id);

      req.onsuccess = function(data) {
        var result = req.result;
        done(function() {
          assert.equal(object._id, id);
          assert.equal(subject._accounts[id], object);
          assert.deepEqual(result.providerType, object.providerType);
        });
      }

      req.onerror = function(err) {
        done(new Error('could not get object'));
      }
    });
  });

  suite('#remove', function() {
    var id;
    var removeEvent;
    var callbackCalled = false;

    setup(function(done) {
      subject.persist({ providerType: 'Local' }, function(err, key) {
        if (err) {
          done(new Error('could not add'));
        } else {
          id = key;
          done();
        }
      });
    });

    setup(function(done) {
      callbackCalled = false;
      subject.remove(id, function() {
        callbackCalled = true;
      });

      subject.once('remove', function() {
        removeEvent = arguments;
        done();
      });
    });

    test('event', function() {
      assert.equal(removeEvent[0], id);
    });

    test('remove', function(done) {
      assert.ok(callbackCalled);
      assert.ok(!subject._accounts[id], 'should remove cached account');
      subject.get(id, function(err, obj) {
        if (err) {
          return done(new Error('error loading'));
        }

        done(function() {
          assert.ok(!obj);
        });
      });
    });

  });

});
