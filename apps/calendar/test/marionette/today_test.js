'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert,
    moment = require('moment');

var DATE_FORMAT = 'YYYY-MM-DD';

marionette('today', function() {
  var app;

  var client = marionette.client({
    settings: { 'keyboard.ftu.enabled': false }
  });

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
  });

  var scenarios = [
    {
      name: 'should show in header, highlighted day',
      setup: function() {
        // In the first scenario we do nothing
        // and expect for the current date to be
        // reflected in the month view.
      }
    },
    {
      name: 'should be show in header, highlighted day after tap today',
      setup: function() {
        // In the second scenario, we swipe to the next month
        // and then click on the today button. We also
        // expect for the current date to be reflected in the month view.
        app
          .swipeLeft()
          .clickToday();
      }
    }
  ];

  scenarios.forEach(function(scenario) {
    test(scenario.name, function() {
      var expectedDate = new Date();
      scenario.setup();

      // Check to make sure the "present" day matches today's day.
      var day = app.month.currentDay;
      var currentDate = day.text();
      // Check to make sure the month feeding the date header is correct.
      var date = app
        .headerContent
        .getAttribute('data-date');

      assert.equal(currentDate, expectedDate.getDate());
      assert.equal(
        moment(date).format(DATE_FORMAT),
        moment(expectedDate).format(DATE_FORMAT)
      );
    });
  });
});
