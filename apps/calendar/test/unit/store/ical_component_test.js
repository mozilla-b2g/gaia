requireLib('db.js');
requireLib('store/abstract.js');
requireLib('store/ical_component.js');

suite('store/ical_component', function() {

  var subject;
  var db;
  var app;

  setup(function(done) {
    this.timeout(5000);
    app = testSupport.calendar.app();
    db = app.db;
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

  suite('#findRecurrencesBefore', function() {
    var max = new Date(2012, 3, 1);
    var after;
    var expected;

    setup(function(done) {
      var trans = db.transaction('icalComponents', 'readwrite');

      trans.oncomplete = function() {
        done();
      };

      expected = [
        new Date(2012, 1, 1),
        new Date(2012, 2, 1),
        new Date(2012, 3, 0)
      ];

      after = [
        new Date(2012, 3, 1, 1),
        new Date(2012, 4, 1)
      ];

      var id = 0;

      function persistList(list, update) {
        list.forEach(function(item, idx) {
          item = Factory('icalComponent', {
            eventId: ++id,
            lastRecurrenceId: item
          });

          if (update) {
            list[idx] = item;
          }

          subject.persist(item, trans);
        });
      }

      persistList(expected, true);
      persistList(after);
    });

    test('found', function(done) {
      subject.findRecurrencesBefore(max, function(err, list) {
        done(function() {
          assert.length(list, expected.length);
          assert.deepEqual(list, expected);
        });
      });
    });
  });

});
