define(function(require) {
'use strict';

var Factory = require('test/support/factory');
var dayObserver = require('day_observer');

suite('day_observer', function() {
  var app;
  var busyToday1, busyToday2, busyTomorrow, busyTodayAllday;
  var calendarStore;
  var delay;
  var findAssociated;
  var _records;
  var subject;
  var timeController;
  var today;
  var tomorrow;
  var yesterday;

  setup(function() {
    // load the required sub-objects..
    app = testSupport.calendar.app();
    subject = dayObserver;
    delay = subject.DISPATCH_DELAY + 5;
    timeController = app.timeController;
    findAssociated = timeController.findAssociated;

    // yes, this is weird but was the "best" way to ensure we are returning
    // only the cached busytimes. we can't talk to the DB for now (we need to
    // check if event handlers are called at the right time)
    _records = new Map();
    timeController.findAssociated = function(busytimes, callback) {
      setTimeout(function() {
        callback(null, busytimes.map((busy) => _records.get(busy)));
      });
    };

    subject.timeController = timeController;
    today = new Date();
    yesterday = new Date();
    yesterday.setDate(today.getDate() - 1);
    tomorrow = new Date();
    tomorrow.setDate(today.getDate() + 1);

    calendarStore = timeController.calendarStore;
    timeController.calendarStore = {
      shouldDisplayCalendar: function() {
        return true;
      },
      on: function() {}
    };
  });

  setup(function() {
    var event1 = Factory('event');
    var event2 = Factory('event');
    var event3 = Factory('event');
    var event4 = Factory('event');

    busyToday1 = Factory('busytime', {
      eventId: event1._id,
      startDate: today
    });

    busyToday2 = Factory('busytime', {
      eventId: event2._id,
      startDate: today
    });

    busyTomorrow = Factory('busytime', {
      eventId: event3._id,
      startDate: tomorrow
    });

    var todayStart = new Date(today.getTime());
    todayStart.setHours(0, 0, 0, 0);
    var tomorrowStart = new Date(todayStart.getTime());
    tomorrowStart.setHours(24);
    busyTodayAllday = Factory('busytime', {
      eventId: event4._id,
      startDate: todayStart,
      endDate: tomorrowStart
    });

    _records.set(busyToday1, {
      busytime: busyToday1,
      event: event1
    });
    _records.set(busyToday2, {
      busytime: busyToday2,
      event: event2
    });
    _records.set(busyTomorrow, {
      busytime: busyTomorrow,
      event: event3
    });
    _records.set(busyTodayAllday, {
      busytime: busyTodayAllday,
      event: event4
    });
  });

  teardown(function() {
    timeController.purgeCache();
    subject.removeAllListeners();
    timeController.calendarStore = calendarStore;
    timeController.findAssociated = findAssociated;
  });

  suite('#on', function() {
    var clock;

    setup(function() {
      clock = sinon.useFakeTimers();
    });

    teardown(function() {
      clock.restore();
    });

    test('cached', function(done) {
      timeController.cacheBusytime(busyTomorrow);
      timeController.cacheBusytime(busyToday1);
      subject.on(today, function(records) {
        assert.deepEqual(records, {
          amount: 1,
          allday: [],
          events: [ _records.get(busyToday1) ]
        });
      });
      clock.tick(delay);
      // this catches the case where 2 listeners are added to same day but
      // after the first dispatch
      subject.on(today, function(records) {
        assert.deepEqual(records, {
          amount: 1,
          allday: [],
          events: [ _records.get(busyToday1) ]
        });
        done();
      });
    });

    test('not cached', function(done) {
      // we should call the handler even if no records because events might be
      // deleted while the view is not active. that way we use the same code
      // path for all cases (first render and updates)
      timeController.cacheBusytime(busyToday1);
      subject.on(yesterday, function(records) {
        assert.deepEqual(records, {
          amount: 0,
          allday: [],
          events: []
        }, 'no records');
        done();
      });
      clock.tick(delay);
    });

    test('add more', function(done) {
      timeController.cacheBusytime(busyToday1);
      subject.on(today, function(records) {
        assert.include(records.events, _records.get(busyToday1));
        assert.include(records.events, _records.get(busyToday2));
        assert.equal(records.amount, 2);
        done();
      });
      timeController.cacheBusytime(busyToday2);
      timeController.cacheBusytime(busyTomorrow);
      clock.tick(delay);
    });

    test('multiple days', function() {
      var event = Factory('event');
      var multi = Factory('busytime', {
        eventId: event._id,
        startDate: yesterday,
        endDate: tomorrow
      });

      _records.set(multi, {
        event: event,
        busytime: multi
      });
      var multiRecord = _records.get(multi);

      var busies = [];

      subject.on(yesterday, function(records) {
        busies = busies.concat(records.events);
      });
      subject.on(today, function(records) {
        busies = busies.concat(records.events);
      });
      subject.on(tomorrow, function(records) {
        busies = busies.concat(records.events);
      });

      timeController.cacheBusytime(multi);

      clock.tick(delay);
      assert.deepEqual(busies, [ multiRecord, multiRecord, multiRecord ]);
    });

    test('allday', function(done) {
      // Bug 1092814 - Disable perma-failing test after DST
      return done();
      /*
      timeController.cacheBusytime(busyToday1);
      timeController.cacheBusytime(busyToday2);
      timeController.cacheBusytime(busyTodayAllday);
      subject.on(today, function(records) {
        assert.deepEqual(records, {
          allday: [ _records.get(busyTodayAllday) ],
          events: [ _records.get(busyToday2), _records.get(busyToday1) ],
          amount: 3
        });
        done();
      });
      clock.tick(delay);
      */
    });
  });

  suite('remove', function() {
    var clock;
    var callback = function() {
      throw new Error('this should not be called');
    };

    setup(function() {
      // it's very important to mock clock BEFORE adding listener!!! otherwise
      // we might get an intermittent race condition (easier to reproduce on
      // gaia-try and also when running these tests multiple times in a row)
      clock = sinon.useFakeTimers();
      subject.on(today, callback);
    });

    teardown(function() {
      clock.restore();
    });

    test('off', function(done) {
      subject.off(today, callback);
      timeController.cacheBusytime(busyToday1);
      clock.tick(delay);
      done();
    });

    test('removeAllListeners', function(done) {
      subject.removeAllListeners();
      timeController.cacheBusytime(busyToday1);
      clock.tick(delay);
      done();
    });
  });
});

});
