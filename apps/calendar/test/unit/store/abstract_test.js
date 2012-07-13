requireApp('calendar/js/responder.js');
requireApp('calendar/js/db.js');
requireApp('calendar/js/store/abstract.js');
requireApp('calendar/test/unit/helper.js');

suite('store/abstract', function() {

  var subject, db;

  setup(function() {
    db = testSupport.calendar.db();
    subject = new Calendar.Store.Abstract(db);
  });

  test('initialization', function() {
    assert.equal(subject.db, db);
    assert.instanceOf(subject, Calendar.Responder);
  });

});

