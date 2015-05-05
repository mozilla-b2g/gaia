define(function(require) {
'use strict';

var Factory = require('test/support/factory');
var core = require('core');
var dayObserver = require('day_observer');

suite('day_observer', function() {
  var busyToday1, busyToday2, busyTomorrow, busyTodayAllday;
  var event1, event2, event3, event4;
  var calendar, hiddenCalendar;
  var calendarColor = '#00aacc';
  var hiddenCalendarColor = '#BADA55';
  var busytimeStore, calendarStore, eventStore;
  var subject;
  var today;
  var tomorrow;
  var yesterday;
  var oneHour = 60 * 60 * 1000;

  suiteSetup(function(done) {
    subject = dayObserver;
    var storeFactory = core.storeFactory;
    eventStore = storeFactory.get('Event');
    busytimeStore = storeFactory.get('Busytime');
    calendarStore = storeFactory.get('Calendar');


    today = new Date();
    today.setHours(8, 0, 0, 0);
    // Set the date to the 15th, so it's in the middle of the month.
    // This helps avoid bug 1128172.
    var DAY = 15;
    today.setDate(DAY);

    yesterday = new Date();
    yesterday.setHours(8, 0, 0, 0);
    yesterday.setDate(DAY - 1);

    tomorrow = new Date();
    tomorrow.setHours(8, 0, 0, 0);
    tomorrow.setDate(DAY + 1);

    core.db.open(done);
  });

  suiteSetup(function(done) {
    calendarStore.all((err) => {
      done(err);
    });
  });

  // we add the events to the DB before calling subject.init() on purpose, just
  // to simulate the app start
  suiteSetup(function(done) {
    calendar = Factory('calendar', {
      localDisplayed: true,
      color: calendarColor
    });
    hiddenCalendar = Factory('calendar', {
      localDisplayed: false,
      color: hiddenCalendarColor
    });

    var calendarId = calendar._id;

    event1 = Factory('event', {
      _id: 'foo',
      calendarId: calendarId
    });
    event2 = Factory('event', {
      _id: 'bar',
      calendarId: calendarId
    });
    event3 = Factory('event', {
      _id: 'baz',
      calendarId: calendarId
    });
    event4 = Factory('event', {
      _id: 'bag',
      calendarId: calendarId
    });

    busyToday1 = Factory('busytime', {
      calendarId: calendarId,
      eventId: event1._id,
      startDate: today
    });

    // tests events that spans thru multiple days
    busyToday2 = Factory('busytime', {
      calendarId: calendarId,
      eventId: event2._id,
      startDate: new Date(today.getTime() + oneHour),
      endDate: tomorrow
    });

    busyTomorrow = Factory('busytime', {
      calendarId: calendarId,
      eventId: event3._id,
      startDate: tomorrow
    });

    var todayStart = new Date(today.getTime());
    todayStart.setHours(0, 0, 0, 0);
    var tomorrowStart = new Date(todayStart.getTime());
    tomorrowStart.setHours(24);
    busyTodayAllday = Factory('busytime', {
      calendarId: calendarId,
      eventId: event4._id,
      startDate: todayStart,
      endDate: tomorrowStart
    });

    // events should be persisted before the busytimes
    Promise.all([
      calendarStore.persist(calendar),
      calendarStore.persist(hiddenCalendar),
      eventStore.persist(event1),
      eventStore.persist(event2),
      eventStore.persist(event3),
      eventStore.persist(event4)
    ]).then(function() {
      Promise.all([
        busytimeStore.persist(busyToday1),
        busytimeStore.persist(busyToday2),
        busytimeStore.persist(busyTomorrow),
        busytimeStore.persist(busyTodayAllday)
      ]).then(function() {
        subject.init();
        done();
      });
    });
  });

  suiteTeardown(function(done) {
    testSupport.calendar.clearStore(
      core.db,
      ['events', 'busytimes', 'calendars'],
      done
    );
  });

  suiteTeardown(function() {
    core.db.close();
  });

  teardown(function() {
    subject.removeAllListeners();
  });

  suite('empty cache', function() {
    test('#on: today', function(done) {
      subject.on(today, function(records) {
        assert.equal(records.amount, 0);
        assert.deepEqual(records.basic, []);
        assert.deepEqual(records.allday, []);
        done();
      });
    });

    test('#findAssociated', function(done) {
      subject.findAssociated(busyTomorrow._id).then(function(record) {
        assert.deepEqual(record.busytime, busyTomorrow);
        assert.deepEqual(record.event, event3);
        done();
      });
    });
  });

  suite('cached', function() {
    suiteSetup(function(done) {
      // make sure we wait enough time until all records are loaded from DB
      function onRecords(records) {
        if (records.amount > 0) {
          subject.off(today, onRecords);
          done();
        }
      }
      // ensures 'monthChange' triggers the load of busytimes, we are not
      // calling `move()` because this is more flexible and less error prone
      core.timeController.emit('monthChange', today);
      subject.on(today, onRecords);
    });

    test('#on: today', function(done) {
      subject.on(today, function(records) {
        assert.equal(records.amount, 3);
        assert.deepEqual(records.basic, [
          {
            event: event1,
            busytime: busyToday1,
            color: calendarColor
          },
          {
            event: event2,
            busytime: busyToday2,
            color: calendarColor
          }
        ]);
        assert.deepEqual(records.allday, [
          {
            event: event4,
            busytime: busyTodayAllday,
            color: calendarColor
          }
        ]);
        done();
      });
    });

    test('#on: tomorrow', function(done) {
      subject.on(tomorrow, function(records) {
        assert.equal(records.amount, 2);
        assert.deepEqual(records.basic, [
          {
            event: event2,
            busytime: busyToday2,
            color: calendarColor
          },
          {
            event: event3,
            busytime: busyTomorrow,
            color: calendarColor
          }
        ]);
        assert.deepEqual(records.allday, []);
        done();
      });
    });

    test('#on: yesterday', function(done) {
      subject.on(yesterday, function(records) {
        assert.equal(records.amount, 0);
        assert.deepEqual(records.basic, []);
        assert.deepEqual(records.allday, []);
        done();
      });
    });

    test('#on: yesterday + persist + remove + visibility', function(done) {
      /* disabled due to intermittent failures see bug 1128275 */
      /* jshint -W027 */
      return done();

      var count = 0;
      var busyYesterday = Factory('busytime', {
        calendarId: calendar._id,
        eventId: event3._id,
        startDate: yesterday
      });
      var busyYesterday2 = Factory('busytime', {
        calendarId: calendar._id,
        eventId: event4._id,
        startDate: new Date(yesterday.getTime() + oneHour)
      });
      // events from hidden calendars should not be displayed
      var busyYesterdayHidden = Factory('busytime', {
        calendarId: hiddenCalendar._id,
        eventId: event4._id,
        startDate: new Date(yesterday.getTime() + oneHour)
      });

      subject.on(yesterday, function(records) {
        count += 1;

        // it should call it once without the new events to make sure our views
        // are "eventually" in sync
        if (count === 1) {
          assert.equal(records.amount, 0, 'first');
          assert.deepEqual(records.basic, []);
          assert.deepEqual(records.allday, []);
          return;
        }

        if (count === 2) {
          if (records.amount === 1) {
            // busytimeStore.persist is async and might take longer than
            // a single dispatch to display all the busytimes, so we make sure
            // we only bump the count if it really updated the value to match
            // the expected result. that is enough to prove that UI will
            // "eventually" reflect the correct amount of items. (Bug 1115083)
            count -= 1;
            return;
          }

          assert.equal(records.amount, 2, 'after persist');
          assert.deepEqual(records.basic, [
            {
              event: event3,
              busytime: busyYesterday,
              color: calendarColor
            },
            {
              event: event4,
              busytime: busyYesterday2,
              color: calendarColor
            }
          ]);
          assert.deepEqual(records.allday, []);
          // remove busytime
          busytimeStore.remove(busyYesterday2._id);
          return;
        }

        if (count === 3) {
          assert.equal(records.amount, 1, 'after remove');
          assert.deepEqual(records.basic, [
            {
              event: event3,
              busytime: busyYesterday,
              color: calendarColor
            }
          ]);
          assert.deepEqual(records.allday, []);
          // toggle calendar visibility
          calendarStore.persist(Factory('calendar', {
            _id: hiddenCalendar._id,
            localDisplayed: true
          }));
          return;
        }

        assert.equal(records.amount, 2, 'after calendar visible');
        assert.deepEqual(records.basic, [
          {
            event: event3,
            busytime: busyYesterday,
            color: calendarColor
          },
          {
            event: event4,
            busytime: busyYesterdayHidden,
            color: calendarColor
          }
        ]);
        assert.deepEqual(records.allday, []);
        done();
      });

      busytimeStore.persist(busyYesterday);
      busytimeStore.persist(busyYesterday2);
      busytimeStore.persist(busyYesterdayHidden);
    });

    test('#findAssociated', function(done) {
      subject.findAssociated(busyToday1._id).then(function(record) {
        assert.deepEqual(record.busytime, busyToday1);
        assert.deepEqual(record.event, event1);
        done();
      });
    });
  });
});
});
