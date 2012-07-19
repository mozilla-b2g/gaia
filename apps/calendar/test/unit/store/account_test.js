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

  test('#presetActive', function() {
    subject._cached[1] = { preset: 'A' };

    assert.isTrue(subject.presetActive('A'));
    assert.isFalse(subject.presetActive('B'));
  });

  suite('#_createModel', function() {
    var connected;

    test('with id', function() {
      var result = subject._createModel({
        providerType: 'Local'
      }, 'id');

      assert.equal(result.providerType, 'Local');
      assert.equal(result._id, 'id');
      assert.instanceOf(result, Calendar.Models.Account);
    });

    test('without id', function() {
     var result = subject._createModel({
        providerType: 'Local'
      });

      assert.equal(result.providerType, 'Local');
      assert.isFalse(('_id' in result));
    });

  });

});
