requireLib('worker/manager.js');
requireLib('timespan.js');
requireApp('calendar/test/unit/provider/mock_stream.js');
requireApp('calendar/js/ext/uuid.js');
requireApp('calendar/test/unit/service/helper.js');
requireLib('ext/ical.js');
requireLib('ext/caldav.js');
requireLib('service/mixins.js');
requireLib('service/caldav.js');
requireLib('service/ical_recur_expansion.js');
requireLib('service/ical.js');
requireLib('provider/caldav_pull_events.js');
requireLib('responder.js');
requireLib('app.js');
requireLib('models/account.js');
requireLib('models/calendar.js');
var uuid;

suiteGroup('Provider.Local', function() {

  var subject;
  var app;
  var db;
  var controller;
  var worker;

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

  suite('importCalendar', function() {
    var calendar;
    var account;
    var eventStore;
    var fixturePath;
    var singleEventPath;
    var dailyEventPath;
    var recurringEventPath;
    var singleEventCalendarPath;
    var dailyEventCalendarPath;
    var recurringEventCalendarPath;
    var worker;
    var workerapp;
    var workersubject;

    setup(function() {
      worker = new Calendar.Controllers.Service(app);
      worker.start();
      app.serviceController = worker;
      workersubject = new Calendar.Provider.Local({
        app: app
      });
      calendar = Factory.create('calendar');
      account = Factory.create('account');
      calendar.app = app;
      fixturePath = '../../test/unit/fixtures/caldav/ical/';
      singleEventPath = fixturePath + 'single_event.ics';
      dailyEventPath = fixturePath + 'daily_event.ics';
      recurringEventPath = fixturePath + 'recurring_event.ics';

      singleEventCalendarPath = {
        format: 'ics',
        url: singleEventPath,
        noOfEvents: 1
      };
      dailyEventCalendarPath = {
        format: 'ics',
        url: dailyEventPath,
        noOfEvents: 1
      };
      recurringEventCalendarPath = {
        format: 'ics',
        url: recurringEventPath,
        noOfEvents: 3,
        eventId: '1-cuuid/1-623c13c0-6c2b-45d6-a12b-c33ad61c4868'
      };
    });

    test('no calendar', function(done) {
      workersubject.importCalendar(dailyEventCalendarPath.url,
        function(err) {
          assert.ok(err);
          assert.deepEqual(err, new Error('no calendar'));
          done();
        }
      );
    });

    test('file is committed', function(done) {
      workersubject.importCalendar(recurringEventCalendarPath.url,
        function(err) {
          assert.ok(!err);
          eventStore = calendar.app.store('Event');
          eventStore.findByIds(
            [recurringEventCalendarPath.eventId],
            function(err, list) {
              for (var eventId in list) {
                assert.equal(
                  list[eventId].calendarId,
                  calendar._id
                );
              }
              done();
            }
          );
        },
        calendar,
        account
      );
    });

    test('no account', function(done) {
      workersubject.importCalendar(singleEventCalendarPath.url,
        function(err) {
          assert.ok(err);
          assert.deepEqual(err, new Error('no account'));
          done();
        },
        calendar,
        null
      );
    });
  });
});
