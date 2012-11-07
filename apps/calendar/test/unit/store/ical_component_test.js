requireApp('calendar/test/unit/helper.js', function() {
  requireLib('db.js');
  requireLib('store/abstract.js');
  requireLib('store/ical_component.js');
});

suite('store/account', function() {

  var subject;
  var db;
  var app;

  setup(function(done) {
    this.timeout(5000);
    app = testSupport.calendar.app();
    db = testSupport.calendar.db();
    subject = db.getStore('IcalComponent');

    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      subject.db,
      ['icalComponents'],
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

});

