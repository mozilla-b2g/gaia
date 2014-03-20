'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert,
    format = require('util').format;

marionette('creating an event', function() {
  var app;
  var client = marionette.client();

  var title = 'Puppy Bowl dogefortlongtextfotestloremipsumdolorsitamet',
      description = 'lorem ipsum dolor sit amet maecennas ullamcor',
      location = 'Animal Planet ' +
                 'reallylongwordthatshouldnotoverflowbecausewewrap',
      date = new Date(),
      startHour = 2,
      duration = 1;

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
    app.createEvent({
      title: title,
      description: description,
      location: location,
      startHour: startHour,
      duration: duration
    });

    app.month.waitForDisplay();
  });

  test('should display the created event in months day', function() {
    var monthDay = app.monthDay;
    var event = monthDay.events[0];
    assert.equal(monthDay.getTitle(event), title);
    assert.equal(monthDay.getLocation(event), location);
    // assert.equal(monthDay.getStartHour(event), '2AM');
  });

  suite('opening event in read view', function() {
    setup(function() {
      var event = app.monthDay.events[0];

      // Scroll so that the first one is in view and click it.
      app.monthDay.scrollToEvent(event);
      event.click();

      // Wait until the read view is displayed.
      app.readEvent.waitForDisplay();
    });

    test('should display the created event in read view', function() {
      var readEvent = app.readEvent;
      assert.equal(readEvent.title, title);
      assert.equal(readEvent.description, description);
      assert.equal(readEvent.location, location);
      assert.equal(readEvent.calendar, 'Offline calendar');
      assert.equal(readEvent.startDate, app.formatDate(date));
      assert.equal(readEvent.startTime, format('%d:00 AM', startHour));
      assert.equal(readEvent.endDate, app.formatDate(date));
      assert.equal(readEvent.endTime, format('%d:00 AM', startHour + duration));
    });

    test('should not overflow title, location, or description', function() {
      var readEvent = app.readEvent;
      app.checkOverflow(readEvent.titleContainer, 'title');
      app.checkOverflow(readEvent.descriptionContainer, 'description');
      app.checkOverflow(readEvent.locationContainer, 'location');
    });
  });
});
