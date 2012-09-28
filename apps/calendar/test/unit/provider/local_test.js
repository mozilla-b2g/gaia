requireApp('calendar/test/unit/helper.js', function() {
  requireLib('ext/uuid.js');
  requireLib('provider/abstract.js');
  requireLib('provider/local.js');
});

suite('provider/local', function() {

  var subject;
  var app;

  setup(function() {
    app = testSupport.calendar.app();
    subject = new Calendar.Provider.Local({
      app: app
    });
  });

  test('initialization', function() {
    assert.equal(subject.app, app);
    assert.instanceOf(subject, Calendar.Provider.Abstract);
  });

  test('#getAccount', function(done) {
    subject.getAccount({}, function(err, success) {
      assert.ok(!err);
      assert.deepEqual(success, {});
      done();
    });
  });

  test('#findCalendars', function(done) {
    // local will always return the same
    // calendar id

    subject.findCalendars({}, function(err, list) {
      done(function() {
        var first = list['local-first'];
        assert.equal(first.id, 'local-first');
        assert.equal(first.name, 'Offline Calendar');
      });
    });
  });

  suite('mutations', function() {
    var events;
    var busytimes;

    var persist;
    var remove;
    var removeBusytime;

    setup(function() {
      persist = null;
      remove = null;

      events = app.store('Event');
      busytimes = app.store('Busytime');

      events.persist = function() {
        persist = arguments;
      }

      events.remove = function() {
        remove = arguments;
      }

      busytimes.removeEvent = function() {
        removeBusytime = arguments;
      }
    });

    suite('#createEvent', function() {

      test('without remote.id', function() {
        var event = { remote: {} };
        var cb = function() {};

        subject.createEvent(event, cb);
        assert.ok(event.remote.id, 'adds id');
        assert.deepEqual(
          persist,
          [event, cb]
        );
      });

      test('with remote.id', function() {
        var event = { remote: { id: 'foo' } };
        var cb = function() {};

        subject.createEvent(event, cb);
        assert.equal(event.remote.id, 'foo', 'does not add id');
        assert.deepEqual(
          persist,
          [event, cb]
        );
      });

    });

    test('#updateEvent', function() {
      var event = { _id: 'foo' };
      var cb = function() {};

      subject.updateEvent(event, cb);
      assert.equal(removeBusytime[0], event._id);

      assert.deepEqual(
        persist,
        [event, cb]
      );
    });

    test('#deleteEvent', function() {
      var event = { _id: 'id' };
      var cb = function() {};

      subject.deleteEvent(event, cb);
      assert.deepEqual(
        remove,
        [event._id, cb]
      );
    });
  });

});
