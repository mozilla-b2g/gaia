requireApp('calendar/test/unit/helper.js', function() {
  requireLib('db.js');
  requireLib('models/account.js');
  requireLib('models/calendar.js');
  requireLib('store/abstract.js');
  requireLib('store/setting.js');
});

suite('store/account', function() {

  var subject;
  var db;
  var app;

  setup(function(done) {
    this.timeout(5000);
    app = testSupport.calendar.app();
    db = testSupport.calendar.db();
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

    test('initial set', function(done) {
      get(name, function(record) {
        done(function() {
          assert.equal(record.value, 'first', 'has correct value');
          assert.deepEqual(subject.cached[name], record, 'caches record');
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

  suite('#syncFrequency', function() {

    test('with persisted value', function(done) {
      subject.set('syncFrequency', 27, function() {
        done(function() {
          assert.equal(subject.syncFrequency, 27, 'post-persist');
        });
      });

      // yes verifying it is updated instantly
      assert.equal(subject.syncFrequency, 27, 'pre-persist');
    });

    test('without persisted value', function() {
      assert.equal(
        subject.syncFrequency,
        subject.defaults.syncFrequency
      );
    });
  });

});
