requireLib('calendar.js');
requireLib('ext/eventemitter2.js');
requireLib('utils/mout.js');
requireLib('calc.js');
requireLib('timespan.js');
requireLib('controller/time.js');
requireLib('day_observer.js');

suite('day_observer', function() {
  'use strict';

  var app;
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
    subject = Calendar.dayObserver;
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
      this.called = true;
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

  teardown(function() {
    timeController.calendarStore = calendarStore;
    timeController.findAssociated = findAssociated;
  });

  suite('#on', function() {
    var busyToday1, busyToday2, busyTomorrow;
    var event1, event2, event3;
    var clock;

    setup(function() {
      event1 = Factory('event');
      event2 = Factory('event');
      event3 = Factory('event');

      busyToday1 = Factory('busytime', {
        eventId: event1._id,
        startDate: today
      });

      busyToday2 = Factory('busytime', {
        eventId: event2._id,
      });

      busyTomorrow = Factory('busytime', {
        eventId: event3._id,
        startDate: tomorrow
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

      clock = sinon.useFakeTimers();
    });

    teardown(function() {
      clock.restore();
      timeController.purgeCache();
      subject.removeAllListeners();
    });

    test('cached', function(done) {
      timeController.cacheBusytime(busyToday1);
      subject.on(today, function(records) {
        assert.deepEqual(records, [ _records.get(busyToday1) ]);
      });
      clock.tick(delay);
      // this catches the case where 2 listeners are added to same day but
      // after the first dispatch
      subject.on(today, function(records) {
        assert.deepEqual(records, [ _records.get(busyToday1) ]);
        done();
      });
    });

    test('not cached', function(done) {
      timeController.cacheBusytime(busyToday1);
      subject.on(yesterday, function() {
        done(new Error('this should not execute!!!'));
      });
      clock.tick(delay);
      assert.ok(
        !timeController.findAssociated.called, 'don\'t call findAssociated'
      );
      done();
    });

    test('add more', function(done) {
      timeController.cacheBusytime(busyToday1);
      subject.on(today, function(records) {
        assert.include(records, _records.get(busyToday1));
        assert.include(records, _records.get(busyToday2));
        done();
      });
      timeController.cacheBusytime(busyToday2);
      clock.tick(delay);
    });

    test('multiple days', function() {
      var multi = Factory('busytime', {
        eventId: event1._id,
        startDate: yesterday,
        endDate: tomorrow
      });

      _records.set(multi, {
        event: event1,
        busytime: multi
      });
      var multiRecord = _records.get(multi);

      var busies = [];

      subject.on(yesterday, function(records) {
        busies = busies.concat(records);
      });
      subject.on(today, function(records) {
        busies = busies.concat(records);
      });
      subject.on(tomorrow, function(records) {
        busies = busies.concat(records);
      });

      timeController.cacheBusytime(multi);

      clock.tick(delay);
      assert.deepEqual(busies, [ multiRecord, multiRecord, multiRecord ]);
    });
  });

  suite('remove', function() {
    var busyToday;
    var clock;
    var callback = function() {
      throw new Error('this should not be called');
    };

    setup(function() {
      busyToday = Factory('busytime', {
        startDate: today
      });

      subject.on(today, callback);
      clock = sinon.useFakeTimers();
    });

    teardown(function() {
      clock.restore();
      timeController.purgeCache();
      subject.removeAllListeners();
    });

    test('off', function(done) {
      subject.off(today, callback);
      timeController.cacheBusytime(busyToday);
      clock.tick(delay);
      done();
    });

    test('removeAllListeners', function(done) {
      subject.removeAllListeners();
      timeController.cacheBusytime(busyToday);
      clock.tick(delay);
      done();
    });
  });

});
