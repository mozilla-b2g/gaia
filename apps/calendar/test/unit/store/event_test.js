requireApp('calendar/test/unit/helper.js', function() {
  requireLib('responder.js');
  requireLib('calc.js');
  requireLib('store/event.js');
});

suite('store/event', function() {
  var subject;
  var db;

  setup(function(done) {
    this.timeout(5000);
    db = testSupport.calendar.db();
    subject = db.getStore('Event');

    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  teardown(function(done) {
    var trans = db.transaction('events', 'readwrite');
    var accounts = trans.objectStore('events');
    var res = accounts.clear();

    res.onerror = function() {
      done(new Error('could not wipe events db'));
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
    assert.equal(subject._store, 'events');
    assert.equal(subject.db, db);
  });

  test('#_createModel', function() {
    var input = { name: 'foo'};
    var output = subject._createModel(input, 1);
    assert.equal(output._id, 1);
    assert.equal(output.name, output.name);
  });

  suite('#removeByCalendarId', function() {

    setup(function(done) {
      subject.persist({
        calendarId: 1
      }, done);
    });

    setup(function(done) {
      subject.persist({
        calendarId: 1
      }, done);
    });

    setup(function(done) {
      subject.persist({
        calendarId: 2
      }, done);
    });

    setup(function() {
      assert.equal(
        Object.keys(subject.cached).length, 3,
        'should have some controls'
      );
    });

    test('removed all events for 1', function(done) {
      subject.removeByCalendarId(1, function() {
        var keys = Object.keys(subject.cached);
        assert.equal(
          keys.length, 1,
          'should have removed all but control'
        );


        assert.equal(
          subject.cached[keys[0]].calendarId,
          2,
          'should not have removed control calendar'
        );

        subject._cached = {};
        subject.load(function(err, result) {
          done(function() {
            var loadKeys = Object.keys(result);
            assert.equal(loadKeys.length, 1);
            var obj = result[loadKeys[0]];
            assert.equal(obj.calendarId, 2);
          });
        });
      });
    });
  });


});
