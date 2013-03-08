requireLib('timespan.js');
requireLib('event_mutations.js');

suite('event_mutations', function() {
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

    db.open(function(err) {
      assert.ok(!err);
      done();
    });
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

    setup(function(done) {
      event = Factory('event');
      component = Factory('icalComponent', {
        eventId: event._id
      });

      var mutation = subject.create({
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
      var expectedBusytime = busytimeStore.factory(
        event
      );

      busytimeStore.get(expectedBusytime._id, function(err, value) {
        done(function() {
          assert.hasProperties(value, {
            eventId: event._id,
            start: event.remote.start,
            end: event.remote.end
          });
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

    setup(function(done) {
      event.remote.foo = true;
      event.remote.start = Calendar.Calc.dateToTransport(
        new Date(2012, 7, 7)
      );

      event.remote.end = Calendar.Calc.dateToTransport(
        new Date(2012, 8, 8)
      );

      component.data = { changed: true };

      var update = subject.update({
        event: event,
        icalComponent: component
      });

      addTime = addEvent = removeTime = null;
      update.commit(done);
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
      var expectedBusytime = busytimeStore.factory(
        event
      );

      busytimeStore.get(expectedBusytime._id, function(err, value) {
        done(function() {
          assert.hasProperties(value, {
            eventId: event._id,
            start: event.remote.start,
            end: event.remote.end
          });
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
