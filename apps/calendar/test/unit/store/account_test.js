requireApp('calendar/js/responder.js');
requireApp('calendar/js/db.js');
requireApp('calendar/js/store/abstract.js');
requireApp('calendar/js/store/account.js');
requireApp('calendar/test/unit/helper.js');

suite('store/accounts', function() {

  var subject, db;

  setup(function() {
    db = testSupport.calendar.db();
    subject = new Calendar.Store.Account(db);
  });

  test('initialization', function() {
    assert.instanceOf(subject, Calendar.Store.Abstract);
    assert.equal(subject.db, db);
    assert.deepEqual(subject._accounts, {});
  });
});
