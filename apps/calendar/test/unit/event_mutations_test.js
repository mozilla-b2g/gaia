// Timespan is always loaded but not in the test
requireLib('timespan.js');

suiteGroup('EventMutations', function() {
  var subject;
  var app;
  var db;

  var controller;

  var eventStore;
  var busytimeStore;
  var alarmStore;
  var componentStore;

  setup(function(done) {
    this.timeout(5000);

    subject = Calendar.EventMutations;
    app = testSupport.calendar.app();
    db = app.db;
    controller = app.timeController;

    eventStore = db.getStore('Event');
    busytimeStore = db.getStore('Busytime');
    alarmStore = db.getStore('Alarm');
    componentStore = db.getStore('IcalComponent');

    db.open(done);
  });

  teardown(function(done) {
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

  var addTime;
  var addEvent;
  var removeTime;

  setup(function() {
    addTime = null;
    addEvent = null;
    removeTime = null;

    var span = new Calendar.Timespan(
      0, Infinity
    );

    controller.observe();
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
      event.remote.start = Calendar.Calc.dateToTransport(
        new Date(Date.now() - 2 * 60 * 60 * 1000)
      );

      // Ending one hour in the future
      event.remote.end = Calendar.Calc.dateToTransport(
        new Date(Date.now() - 1 * 60 * 60 * 1000)
      );

      mutation = subject.create({
        event: event,
        icalComponent: component
      });

      mutation.commit(done);

      // verify that we sent to controller
      assert.ok(addEvent, 'sent controller event');
      assert.ok(addTime, 'sent controller time');

      // check we sent the right event over.
      assert.hasProperties(addEvent, event, 'controller event');
      assert.equal(addTime.eventId, event._id, 'controller time');
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
      event.remote.start = Calendar.Calc.dateToTransport(
        new Date(Date.now() - 1 * 60 * 60 * 1000)
      );

      // Ending one hour in the future
      event.remote.end = Calendar.Calc.dateToTransport(
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

      addTime = addEvent = removeTime = null;
      mutation.commit(done);
    });

    test('controller events', function() {
      // verify we sent the controller stuff before
      // fully sending to the db.
      assert.ok(addTime, 'controller time');
      assert.ok(addEvent, 'controller event');
      assert.ok(removeTime, 'controller removed time');

      assert.hasProperties(addTime, {
        start: event.remote.start,
        end: event.remote.end
      });
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
          for (var i = 0, alarm; alarm = expectedAlarms[i]; i++) {
            assert.equal(
              event.remote.start.utc + alarm.trigger * 1000,
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
