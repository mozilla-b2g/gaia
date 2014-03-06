'use strict';

var Calendar = require('./calendar'),
    assert = require('chai').assert;

marionette('month view', function() {
  var app;
  var client = marionette.client();

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
  });

  test('#months-day-view scroll', function() {
    app.createEvent({
      title: 'Long Event',
      location: 'Dolor Amet',
      startHour: 0,
      duration: 16
    });
    app.waitForMonthView();

    var monthDayViewEvents = app.findElement('monthDayViewEvents');

    assert.equal(
      monthDayViewEvents.getAttribute('scrollTop'),
      0,
      'scroll should start at zero'
    );

    var pos = monthDayViewEvents.location();
    var x = pos.x + 30;
    var body = client.findElement('body');
    // fast vertical swipe, needs to happen on the body since we want
    // coordinates to be absolute
    app.actions
      .flick(body, x, pos.y + 10, x, 50)
      .perform();

    // this will timeout if scroll did not change
    client.waitFor(function() {
      return monthDayViewEvents.getAttribute('scrollTop') > 0;
    });
  });

});
