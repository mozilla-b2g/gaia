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
