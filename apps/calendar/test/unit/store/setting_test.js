requireLib('models/account.js');
requireLib('models/calendar.js');
requireLib('store/abstract.js');
requireLib('store/setting.js');

suite('store/setting', function() {

  var subject;
  var db;
  var app;

  setup(function(done) {
    this.timeout(5000);
    app = testSupport.calendar.app();
    db = app.db;
    subject = db.getStore('Setting');

    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      subject.db,
      ['settings'],
      done
    );
  });

  teardown(function() {
    db.close();
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.Store.Abstract);
    assert.equal(subject.db, db);
    assert.deepEqual(subject._cached, {});
  });

  function get(id, callback) {
    var trans = db.transaction('settings');
    var store = trans.objectStore('settings');
    store.get(id).onsuccess = function(e) {
      callback(e.target.result);
    };
  }

  suite('#set', function() {
    var name = 'someFoo';
    var calledEvent;

    setup(function(done) {
      subject.on(name + 'Change', function() {
        calledEvent = arguments;
      });
      subject.set(name, 'first', done);
    });

    test('persistence', function(done) {
      get(name, function(record) {
        done(function() {
          assert.equal(record.value, 'first', 'has correct value');
          assert.instanceOf(record.createdAt, Date, 'updatedAt');
          assert.instanceOf(record.updatedAt, Date, 'createdAt');
          assert.deepEqual(
            calledEvent,
            ['first', record],
            'calls ' + name + 'Change'
          );
        });
      });
    });
  });

  suite('#getValue', function() {
    test('with a default', function(done) {
      subject.getValue('syncFrequency', function(err, value) {
        done(function() {
          assert.equal(value, subject.defaults.syncFrequency);
        });
      });
    });

    suite('with value', function() {

      setup(function(done) {
        subject.set('syncFrequency', 200, done);
      });

      test('after set', function(done) {
        subject.getValue('syncFrequency', function(err, value) {
          // test cached version
          subject.getValue('syncFrequency', function(err, cachedValue) {
            done(function() {
              assert.equal(value, 200, 'returns correct value');
              assert.equal(value, cachedValue, 'cached value is equal');
            });
          });
        });
      });
    });
  });

});
