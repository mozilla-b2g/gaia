define(function(require) {
'use strict';

var Factory = require('test/support/factory');
var mockRequestWakeLock = require('test/support/mock_request_wake_lock');
var controller = require('controllers/notifications');
var core = require('core');
var mochaPromise = require('test/support/mocha_promise');
var notification = require('notification');
var waitFor = require('test/support/wait_for');

suite('controllers/notifications', function() {
  var alarm;
  var db;
  var sendNotification;
  var storeFactory;

  setup(function() {
    mockRequestWakeLock.setup();
    sendNotification = sinon.spy(notification, 'sendNotification');
  });

  setup(function(done) {
    storeFactory = core.storeFactory;
    db = core.db;
    db.open(done);
  });

  setup(function(done) {
    var start = new Date();
    var end = new Date();
    end.setHours(end.getHours() + 1);

    // Inject event, busytime, and alarm into db.
    var event = Factory('event', {
      _id: 'event-one',
      remote: {
        title: 'Birthday',
        startDate: start,
        endDate: end
      }
    });

    event.description = null;
    event.remote.description = null;

    var busytime = Factory('busytime', {
      eventId: 'event-one',
      startDate: start,
      endDate: end,
      _id: 'busytime-one'
    });

    alarm = Factory('alarm', {
      eventId: 'event-one',
      busytimeId: 'busytime-one',
      _id: 'alarm-one'
    });

    var eventStore = storeFactory.get('Event');
    var busytimeStore = storeFactory.get('Busytime');
    var alarmStore = storeFactory.get('Alarm');

    Promise.all([
      eventStore.persist(event),
      busytimeStore.persist(busytime),
      alarmStore.persist(alarm)
    ])
    .then(() => done());
  });

  teardown(function() {
    sendNotification.restore();
    mockRequestWakeLock.teardown();
  });

  teardown(function(done) {
    testSupport.calendar.clearStore(db, [
      'events',
      'busytimes',
      'alarms'
    ], done);
  });

  teardown(function() {
    db.close();
  });

  suite('#onAlarm', function() {
    mochaPromise(test, 'cpu lock', function() {
      controller.onAlarm(alarm);

      return waitFor(function() {
        var locks = mockRequestWakeLock.locks;
        var lock = locks[0];
        return lock && lock.type === 'cpu' && lock.unlocked;
      });
    });

    mochaPromise(test, 'should send alarm notification', function() {
      controller.onAlarm(alarm);

      return waitFor(function() {
        // Notably, even though our event description was null, we don't pass on
        // 'null' to the notification body.
        return sendNotification.calledWith('Birthday started just now', '');
      });
    });
  });
});

});
