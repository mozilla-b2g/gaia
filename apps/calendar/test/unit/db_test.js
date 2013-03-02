requireLib('ext/uuid.js');
requireLib('db.js');
requireLib('models/account.js');
requireLib('models/calendar.js');
requireLib('presets.js');

suite('db', function() {
  var subject;
  var name;
  var app;

  var dbName = 'calendar-db-test-db';

  suiteSetup(function(done) {

    // load the required sub-objects..
    app = testSupport.calendar.app();
    app.loadObject('Provider.Local', done);
  });

  suiteSetup(function(done) {
    this.timeout(10000);
    var db = new Calendar.Db(dbName);
    db.deleteDatabase(function(err, success) {
      assert.ok(!err, 'should not have an error when deleting db');
      assert.ok(success, 'should be able to delete the db');
      done();
    });
  });

  suiteTeardown(function() {
    subject.close();
  });

  setup(function() {
    subject = new Calendar.Db(dbName);
  });

  test('#getStore', function() {
    var result = subject.getStore('Account');
    assert.instanceOf(result, Calendar.Store.Account);

    assert.equal(result.db, subject);
    assert.equal(subject._stores['Account'], result);
  });

  test('initialization', function() {
    // create test db
    assert.ok(subject.name);
    assert.include(subject.name, 'test');
    assert.ok(subject.store);

    assert.instanceOf(subject, Calendar.Responder);
    assert.deepEqual(subject._stores, {});
    assert.isTrue(Object.isFrozen(subject.store));
  });

  test('#_openStore', function() {
    var Store = function(db) {
      this.db = db;
    };

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

    teardown(function() {
      subject.close();
    });

    test('result', function(done) {
      var trans = subject.transaction(['events'], 'readonly');

      assert.equal(trans.mode, 'readonly');

      trans.onabort = function() {
        done();
      };

      trans.abort();
    });

  });

  suite('#open', function() {
    suite('on version change', function() {

      setup(function(done) {
        subject.deleteDatabase(done);
      });

      suite('#setupDefaults', function() {
        var accountStore;
        var calendarStore;

        var storeLoads = {};

        teardown(function() {
          storeLoads = {};
          subject.close();
        });

        setup(function(done) {
          accountStore = subject.getStore('Account');
          calendarStore = subject.getStore('Calendar');
          subject.load(function() {
            Calendar.nextTick(function() {
              done();
            });
          });
        });

        ['Calendar', 'Account'].forEach(function(storeName) {
          setup(function(done) {
            var store = subject.getStore(storeName);
            var humanName = storeName.toLowerCase() + 's';

            store.all(function(err, all) {
              storeLoads[humanName] = all;
              done();
            });
          });
        });

        test('default account', function() {
          var list = Object.keys(storeLoads.accounts);

          assert.length(list, 1);

          var item = storeLoads.accounts[list[0]];

          assert.ok(item);
          assert.equal(item.providerType, 'Local', 'provider');
          assert.equal(item.preset, 'local', 'preset');
        });

        test('default calendar', function() {
          var list = Object.keys(storeLoads.calendars);
          assert.length(list, 1);

          var item = storeLoads.calendars[list[0]];

          assert.ok(item);
          assert.equal(item.remote.name, 'Offline calendar');

          var account = storeLoads.accounts[item.accountId];
          assert.ok(account, 'has account');
          assert.equal(account.providerType, 'Local');
        });

      });

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
            subject.close();
          }
        });

        subject.open(function() {
          assert.ok(subject.connection, 'has connection');
          assert.ok(subject.isOpen, 'is open');
          assert.ok(subject.version, 'has version');
          assert.equal(subject.oldVersion, 0, 'upgraded from 0');
          assert.isTrue(subject.hasUpgraded, 'has upgraded');
          assert.equal(subject.connection.name, subject.name);
          finishedOpen = true;
        });
      });
    });

    suite('after version change', function() {
      teardown(function() {
        subject.close();
      });

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
