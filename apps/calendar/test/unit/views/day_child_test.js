/*
requireLib('utils/ordered_map.js');
requireLib('templates/day.js');
requireLib('views/day_based.js');
requireLib('views/day_child.js');
*/
requireLib('timespan.js');

suiteGroup('Views.DayChild', function() {
  var subject;
  var app;
  var db;
  var controller;
  var events;
  var template;
  var viewDate = new Date(2012, 1, 15);

  setup(function() {
    app = testSupport.calendar.app();
    db = app.db;
    controller = app.timeController;
    events = app.store('Event');

    subject = new Calendar.Views.DayChild({
      app: app,
      date: viewDate
    });

    template = Calendar.Templates.Day;
  });

  test('initialization', function() {
    assert.equal(subject.controller, controller);
    assert.instanceOf(subject, Calendar.View);
    assert.instanceOf(subject, Calendar.Views.DayBased);
    assert.equal(subject._changeToken, 0);
  });

  test('#events', function() {
    subject.create();
    assert.ok(subject.events);

    assert.ok(
      subject.events.classList.contains('day-events')
    );

    assert.equal(
      subject.events.tagName.toLowerCase(),
      'section'
    );
  });

  test('#_renderAttendees', function() {
    var list = ['z', 'y'],
        result = subject._renderAttendees(list);

    assert.include(result, '>z<');
    assert.include(result, '>y<');
  });

  test('#_renderEvent', function() {
    var event = Factory('event', {
      remote: {
        title: 'UX',
        location: 'Paris',
        attendees: ['zoo', 'barr']
      }
    });

    var busytime = Factory('busytime');

    var result = subject._renderEvent(busytime, event);
    assert.ok(result);

    assert.include(result, 'has-alarms');
    assert.include(result, 'UX');
    assert.include(result, 'Paris');
    assert.include(result, '>zoo<');
    assert.include(result, '>barr<');
  });

  test('#_renderEvent without alarms', function() {
    var event = Factory('event', {
      remote: {
        alarms: []
      }
    });

    var busytime = Factory('busytime');

    var result = subject._renderEvent(busytime, event);
    assert.ok(result);

    assert.ok(result.indexOf('has-alarms') === -1);
  });

  test('#_renderEvent undefined alarms, bug 868600', function() {
    var event = Factory('event', {
      remote: {
        title: '|rendercheck|'
      }
    });
    delete event.remote.alarms;

    var busytime = Factory('busytime');

    var result = subject._renderEvent(busytime, event);
    assert.ok(result);

    assert.include(result, '|rendercheck|');
  });
});
