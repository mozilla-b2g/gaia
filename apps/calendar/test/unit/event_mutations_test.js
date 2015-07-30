define(function(require) {
'use strict';

var Calc = require('common/calc');
var EventMutations = require('event_mutations');
var Factory = require('test/support/factory');
var core = require('core');

suite('EventMutations', function() {
  var subject;
  var db;

  var controller;

  var eventStore;
  var busytimeStore;
  var alarmStore;
  var componentStore;
  var shouldDisplay;
  var storeFactory;

  setup(function(done) {
    subject = EventMutations;
    db = core.db;
    controller = core.timeController;
    shouldDisplay = controller._shouldDisplayBusytime;
    controller._shouldDisplayBusytime = function() {
      return true;
    };

    storeFactory = core.storeFactory;
    eventStore = storeFactory.get('Event');
    busytimeStore = storeFactory.get('Busytime');
    alarmStore = storeFactory.get('Alarm');
    componentStore = storeFactory.get('IcalComponent');

    db.open(done);
  });

  teardown(function(done) {
    controller._shouldDisplayBusytime = shouldDisplay;
    testSupport.calendar.clearStore(
      db,
      [
       'events',
       'busytimes',
       'alarms',
       'icalComponents'
      ],
      function() {
        db.close();
        done();
      }
    );
  });

  suite('#create', function() {

    var event;
    var component;
    var mutation;

    setup(function(done) {
      event = Factory('event');
      component = Factory('icalComponent', {
        eventId: event._id
      });

      // Set the event to start and end in the past
      event.remote.start = Calc.dateToTransport(
        new Date(Date.now() - 2 * 60 * 60 * 1000)
      );

      // Ending one hour in the future
      event.remote.end = Calc.dateToTransport(
        new Date(Date.now() - 1 * 60 * 60 * 1000)
      );

      mutation = subject.create({
        event: event,
        icalComponent: component
      });

      mutation.commit(done);
    });

    test('event', function(done) {
      eventStore.get(event._id, function(err, value) {
        done(function() {
          assert.ok(value);
        });
      });
    });

    test('busytime', function(done) {
      var busytime = mutation.busytime;
      assert.ok(busytime._id, 'has _id');

      busytimeStore.get(busytime._id, function(err, value) {
        done(function() {
          assert.hasProperties(value, {
            eventId: event._id,
            calendarId: event.calendarId,
            start: event.remote.start,
            end: event.remote.end
          });
        });
      });
    });

    test('alarms', function(done) {
      var expectedAlarms = [];
      var busyId = mutation.busytime._id;

      alarmStore.findAllByBusytimeId(busyId, function(err, values) {
        done(function() {
          assert.equal(values.length, expectedAlarms.length);
        });
      });
    });

    test('icalComponent', function(done) {
      componentStore.get(event._id, function(err, value) {
        done(function() {
          assert.deepEqual(value, component);
        });
      });
    });

  });

  suite('#update', function() {
    var event;
    var component;

    setup(function(done) {
      event = Factory('event');
      component = Factory('icalComponent', {
        eventId: event._id
      });

      var create = subject.create({
        event: event,
        icalComponent: component
      });

      create.commit(done);
    });

    var mutation;
    setup(function(done) {
      event.remote.foo = true;

      // Starting one hour in the past
      event.remote.start = Calc.dateToTransport(
        new Date(Date.now() - 1 * 60 * 60 * 1000)
      );

      // Ending one hour in the future
      event.remote.end = Calc.dateToTransport(
        new Date(Date.now() + 1 * 60 * 60 * 1000)
      );

      var futureTrigger = Date.now() - event.remote.start.utc + 5000;

      event.remote.alarms = [
        {action: 'DISPLAY', trigger: 60},
        {action: 'DISPLAY', trigger: 300},

        // Create an alarm in the future
        {action: 'DISPLAY', trigger: futureTrigger}
      ];

      component.data = { changed: true };

      mutation = subject.update({
        event: event,
        icalComponent: component
      });

      mutation.commit(done);
    });

    test('event', function(done) {
      eventStore.get(event._id, function(err, value) {
        done(function() {
          assert.hasProperties(
            value.remote,
            {
              start: event.remote.start,
              end: event.remote.end
            }
          );
        });
      });
    });

    test('busytime', function(done) {
      busytimeStore.get(mutation.busytime._id, function(err, value) {
        done(function() {
          assert.hasProperties(value, {
            eventId: event._id,
            start: event.remote.start,
            end: event.remote.end
          });
        });
      });
    });

    test('alarms', function(done) {
      var expectedAlarms = event.remote.alarms;
      var busyId = mutation.busytime._id;

      alarmStore.findAllByBusytimeId(busyId, function(err, values) {
        done(function() {
          assert.equal(values.length, expectedAlarms.length);
          for (var i = 0; i < expectedAlarms.length; i++) {
            assert.equal(
              event.remote.start.utc + expectedAlarms[i].trigger * 1000,
              values[i].trigger.utc
            );
          }
        });
      });
    });

    test('icalComponent', function(done) {
      componentStore.get(event._id, function(err, value) {
        done(function() {
          assert.deepEqual(value, component);
        });
      });
    });
  });
});

});
