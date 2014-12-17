define(function(require) {
'use strict';

var Factory = require('test/support/factory');
var mockRequestWakeLock = require('test/support/mock_request_wake_lock');
var controller = require('controllers/notifications');
var notification = require('notification');
var waitFor = require('test/support/wait_for');

suite('controllers/notifications', function() {
  var alarm;
  var app;
  var db;
  var sendNotification;

  setup(function() {
    mockRequestWakeLock.setup();
    sendNotification = sinon.spy(notification, 'sendNotification');
  });

  setup(function(done) {
    app = testSupport.calendar.app();
    db = app.db;
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

    var eventStore = db.getStore('Event');
    eventStore.app = app;
    var busytimeStore = db.getStore('Busytime');
    busytimeStore.app = app;
    var alarmStore = db.getStore('Alarm');

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
    test('cpu lock', function(done) {
      controller.onAlarm(alarm);

      waitFor(function() {
        var locks = mockRequestWakeLock.locks;
        var lock = locks[0];
        return lock && lock.type === 'cpu' && lock.unlocked;
      }, done);
    });

    test('should send alarm notification', function(done) {
      controller.onAlarm(alarm);

      waitFor(function() {
        // Notably, even though our event description was null, we don't pass on
        // 'null' to the notification body.
        return sendNotification.calledWith(
          'Birthday started just now',
          ''
        );
      }, done);
    });
  });
});

});
