requireApp('calendar/test/unit/helper.js', function() {
  requireLib('responder.js');
  requireLib('db.js');
  requireLib('store/abstract.js');
  requireApp('calendar/test/unit/helper.js');
});

suite('store/abstract', function() {

  var subject, db;

  setup(function(done) {
    db = testSupport.calendar.db();
    subject = new Calendar.Store.Abstract(db);

    // set _store to accounts so we can actually
    // persist stuff.
    subject._store = 'accounts';

    subject._createModel = function(object, id) {
      object._id = id;
      return object;
    };

    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  teardown(function(done) {
    var trans = db.transaction(subject._store, 'readwrite');
    var accounts = trans.objectStore(subject._store);
    var res = accounts.clear();

    res.onerror = function() {
      done(new Error('could not wipe accounts db'));
    }

    res.onsuccess = function() {
      done();
    }
  });

  test('initialization', function() {
    assert.equal(subject.db, db);
    assert.instanceOf(subject, Calendar.Responder);
    assert.deepEqual(subject._cached, {});
  });

  suite('#persist', function() {

    var events;
    var id;
    var object;

    function watchEvent(event, done) {
      subject.once(event, function() {
        events[event] = arguments;
        if (typeof(done) === 'function') {
          done();
        }
      });
    }

    function checkEvent(event, id, object) {
      var list = events[event];

      assert.equal(list[0], id);
      assert.equal(list[1], object);
    }

    setup(function(done) {
      object = this.object;
      events = {};

      if (this.persist !== false) {
        subject.persist(object, function(err, key) {
          id = key;
        });

        watchEvent('add');
        watchEvent('update');
        watchEvent('persist', done);
      } else {
        done();
      }
    });

    function get(id, callback) {
      var trans = subject.db.transaction(subject._store);
      var req = trans.objectStore(subject._store).get(id);

      req.onsuccess = function(data) {
        var result = req.result;
        callback(null, result);
      }

      req.onerror = function(err) {
        callback(new Error('could not get object'));
      }
    }

    suite('with transaction', function() {

      suiteSetup(function() {
        this.persist = false;
      });

      test('result', function(done) {
        this.timeout(400);
        var trans;
        var obj = { name: 'foo' };
        var callbackFired = false;
        var transFired = false;
        var pending = 2;

        function next() {
          pending--;
          if (!pending)
            complete();
        }

        function complete() {
          done(function() {
            assert.isTrue(callbackFired);
            assert.isTrue(transFired);
          });
        }

        trans = subject.db.transaction(
          subject._store,
          'readwrite'
        );

        trans.oncomplete = function() {
          transFired = true;
          next();
        };

        subject.persist(obj, trans, function() {
          callbackFired = true;
          next();
        });

      });

    });

    suite('update', function() {
      var id = 'uniq';
      suiteSetup(function() {
        this.persist = true;
        this.object = { providerType: 'local', _id: 'uniq' };
      });

      test('update event', function() {
        checkEvent('update', id, object);
      });

      test('persist event', function() {
        checkEvent('persist', id, object);
      });

      test('db persistance', function(done) {
        get(id, function(err, result) {
          if (err) {
            done(err);
            return;
          }

          done(function() {
            assert.equal(object._id, id);
            assert.equal(subject._cached[id], object);
            assert.deepEqual(result.providerType, object.providerType);
          });
        });
      });
    });

    suite('add', function() {
      suiteSetup(function() {
        this.persist = true;
        this.object = { providerType: 'local' };
      });

      test('add event', function() {
        checkEvent('add', id, object);
      });

      test('persist event', function() {
        checkEvent('persist', id, object);
      });

      test('db persistance', function(done) {
        get(id, function(err, result) {
          if (err) {
            done(err);
            return;
          }

          done(function() {
            assert.equal(object._id, id);
            assert.equal(subject._cached[id], object);
            assert.deepEqual(result.providerType, object.providerType);
          });
        });
      });
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

    test('remove', function() {
      assert.ok(callbackCalled);
      assert.ok(!subject._cached[id], 'should remove cached account');
    });

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
        assert.ok(obj._id);
        assert.equal(obj.providerType, 'Local');
      }
    });
  });

  test('#cached', function() {
    assert.equal(subject.cached, subject._cached);
  });

  suite('#_objectData', function() {
    test('with toJSON', function() {
      var obj = {};
      obj.toJSON = function() {
        return 'foo';
      }

      assert.equal(subject._objectData(obj), 'foo');
    });

    test('without toJSON', function() {
      var obj = Object.create(null);
      obj.foo = '1';

      assert.equal(subject._objectData(obj), obj);
    });

  });

});
