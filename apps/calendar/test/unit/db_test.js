requireApp('calendar/test/unit/helper.js', function() {
  requireLib('db.js');
});

suite('db', function() {
  var subject;
  var name;

  setup(function(done) {
    this.timeout(5000);
    subject = testSupport.calendar.db();
    subject.open(function() {
      subject.close();
      done();
    });
  });

  setup(function(done) {
    this.timeout(5000);
    name = subject.name;

    subject.deleteDatabase(function(err, success) {
      assert.ok(!err, 'should not have an error when deleting db');
      assert.ok(success, 'should be able to delete the db');
      done();
    });
  });

  test('#getStore', function() {
    var result = subject.getStore('Account');
    assert.instanceOf(result, Calendar.Store.Account);

    assert.equal(result.db, subject);
    assert.equal(subject._stores['Account'], result);
  });

  test('initialization', function() {
    // create test db
    assert.equal(subject.name, name);
    assert.ok(subject.version);
    assert.ok(subject.store);

    assert.instanceOf(subject, Calendar.Responder);
    assert.deepEqual(subject._stores, {});
    assert.isTrue(Object.isFrozen(subject.store));
  });

  test('#_openStore', function() {
    var Store = function(db) {
      this.db = db;
    }

    Store.prototype = {
      __proto__: Calendar.Store.Abstract.prototype,

      onopen: function() {
        this.open = true;
      }
    };
  });

  suite('#transaction', function() {

    setup(function(done) {
      subject.open(function() {
        done();
      });
    });

    test('result', function(done) {
      var trans = subject.transaction(['events'], 'readonly');

      assert.equal(trans.mode, 'readonly');

      trans.onabort = function() {
        done();
      }

      trans.abort();
    });

  });

  teardown(function() {
    subject.close();
  });

  test('#load', function(done) {
    var loaded = {
      account: false,
      calendar: false
    };

    var account = subject.getStore('Account');
    var calendar = subject.getStore('Calendar');

    account.load = function(callback) {
      callback(null, {});
      loaded.account = true;
    }

    calendar.load = function(callback) {
      callback(null, {});
      loaded.calendar = true;
    }

    assert.ok(!subject.isOpen);

    subject.load(function(err) {
      if (err) {
        done(err);
        return;
      }
      assert.ok(subject.isOpen);
      done(function() {
        assert.ok(loaded.account, 'should load account');
        assert.ok(loaded.calendar, 'should load calendar');
      });
    });
  });

  suite('#open', function() {
    suite('on version change', function() {
      // db should be destroyed at this point

      test('creation of stores', function(done) {
        var finishedOpen = false;

        assert.ok(!subject.connection, 'connection should be closed');

        subject.on('open', function() {
          if (!finishedOpen) {
            done(new Error(
              'fired callback/event out of order ' +
              'callback should fire then events'
            ));
          } else {
            done(function() {
              // check that each store now exists
              var stores = subject.connection.objectStoreNames;
              var actualStore;
              for (actualStore in subject.store) {
                assert.ok(
                  (stores.contains(actualStore)),
                  actualStore + ' was not created'
                );
              }
            });
          }
        });

        subject.open(function() {
          assert.ok(subject.connection);
          assert.ok(subject.isOpen);
          assert.equal(subject.connection.name, name);
          finishedOpen = true;
        });
      });
    });

    suite('after version change', function() {

      setup(function(done) {
        // make sure db is open
        subject.open(function() {
          done();
        });
      });

      test('open', function(done) {
        // close it
        subject.close();
        subject = new Calendar.Db(subject.name);

        subject.open(function() {
          done();
        });
      });

    });

  });


});
