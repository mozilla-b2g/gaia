requireLib('timespan.js');

var uuid;

suiteGroup('Provider.Local', function() {

  var subject;
  var app;
  var db;
  var controller;

  setup(function(done) {
    app = testSupport.calendar.app();
    subject = new Calendar.Provider.Local({
      app: app
    });

    controller = app.timeController;

    db = app.db;
    db.open(function(err) {
      assert.ok(!err);
      done();
    });
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(
      db,
      ['accounts', 'calendars', 'events', 'busytimes'],
      done
    );
  });

  teardown(function() {
    db.close();
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

  /* disabled in Bug 838993, to be reenabled asap in Bug 840489.
   * this happens when using a firefox launched with a french locale, we
   * probably need to mock the l10n library instead of using it.
   *
   *   1) [calendar] provider/local #findCalendars:
   *        Error: expected 'Agenda hors-ligne' to equal 'Offline calendar'
   *
  test('#findCalendars', function(done) {
    // local will always return the same
    // calendar id

    subject.findCalendars({}, function(err, list) {
      done(function() {
        var first = list['local-first'];
        assert.equal(first.id, 'local-first');
        assert.equal(first.name, 'Offline calendar');
      });
    });
  });
  */

  suite('mutations', function() {
    var events;
    var busytimes;

    var addEvent;
    var addTime;
    var removeTime;

    setup(function() {
      events = app.store('Event');
      busytimes = app.store('Busytime');

      var span = new Calendar.Timespan(
        0, Infinity
      );

      controller.observeTime(span, function(e) {
        switch (e.type) {
          case 'add':
            addTime = e.data;
            addEvent = controller._eventsCache[addTime.eventId];
            break;
          case 'remove':
            removeTime = e.data;
            break;
        }
      });
    });

    function find(eventId, done) {
      var trans = db.transaction(
        events._dependentStores,
        'readwrite'
      );

      trans.oncomplete = function() {
        done(busytime, event);
      };

      var event;
      var busytime;

      events.get(eventId, trans, function(err, record) {
        event = record;
      });


      var index = trans.objectStore('busytimes').index('eventId');

      index.get(eventId).onsuccess = function(e) {
        busytime = e.target.result;
      };
    }

    suite('#createEvent', function() {
      var event;

      function verify(done) {
        subject.createEvent(event, function() {
          find(event._id, function(busytime, event) {
            done(function() {
              assert.deepEqual(event, event);
              assert.hasProperties(addTime, busytime);
            });
          });
        });
      }

      test('without remote.id', function(done) {
        event = Factory('event');
        delete event.remote.id;
        delete event._id;

        verify(done);

        assert.ok(event.remote.id, 'adds id');
      });

      test('with remote.id', function(done) {
        event = Factory('event');
        delete event._id;
        var id = event.remote.id;
        verify(done);

        assert.equal(event.remote.id, id, 'id change');
      });
    });

    suite('#updateEvent', function() {

      //XXX: in the future we should skip the saving.
      suite('update with same values', function() {
        var event;
        var busytime;

        setup(function(done) {
          event = Factory('event');
          subject.createEvent(event, done);
        });

        setup(function(done) {
          subject.updateEvent(event, busytime, function(err, busy, ev) {
            event = ev;
            busytime = busy;
            done();
          });
        });

        test('event', function(done) {
          assert.ok(event);
          events.count(function(err, count) {
            done(function() {
              assert.equal(count, 1);
            });
          });
        });

        test('busytime', function(done) {
          assert.hasProperties(busytime, {
            eventId: event._id, calendarId: event.calendarId
          });

          busytimes.count(function(err, count) {
            done(function() {
              assert.equal(count, 1);
            });
          });
        });
      });

    });

    suite('#deleteEvent', function() {
      var event;

      setup(function(done) {
        event = Factory('event');
        subject.createEvent(event, done);
      });

      setup(function(done) {
        subject.deleteEvent(event, done);
      });

      test('busytime count', function(done) {
        busytimes.count(function(err, count) {
          done(function() {
            assert.equal(count, 0);
          });
        });
      });

      test('event count', function(done) {
        events.count(function(err, count) {
          done(function() {
            assert.equal(count, 0);
          });
        });
      });
    });

  });
});
