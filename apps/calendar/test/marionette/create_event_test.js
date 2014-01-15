'use strict';

var Calendar = require('./calendar'),
    assert = require('chai').assert;


// test is disabled see: Bug 919066
marionette('creating an event', function() {
  var app;
  var client = marionette.client();

  // we always use today as base day to make test simpler, we also
  // set the hours/minutes so it always shows up at first hours of event list
  // (avoids conflicts with click events)
  var startDate = new Date(), endDate = new Date();
  startDate.setHours(2);
  startDate.setMinutes(0);
  startDate.setSeconds(0);
  startDate.setMilliseconds(0);
  endDate.setTime(startDate.getTime() + 60 * 60 * 1000 /* one hour */);
  var sourceData = {
    title: 'Puppy Bowl dogefortlongtextfotestloremipsumdolorsitamet',
    location: 'Animal Planet reallylongwordthatshouldnotoverflowbecausewewrap',
    description: 'lorem ipsum dolor sit amet maecennas ullamcor',
    startDate: startDate,
    endDate: endDate
  };

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });

    app.createEvent(sourceData);

    // Wait until we return to the base, month view.
    app.waitForMonthView();
  });

  suite('vanilla event', function() {
    test('should show event in month view', function() {
      var event = app.waitForElement('monthViewDayEvent');
      var title = app.waitForChild(event, 'monthViewDayEventName');
      var location = app.waitForChild(event, 'monthViewDayEventLocation');
      assert.equal(title.text(), sourceData.title);
      assert.equal(location.text(), sourceData.location);
    });
  });

  suite('view event', function() {

    setup(function() {
      // FIXME: temporary hack for keyboard while Bug 965131 is fixed
      app.waitForKeyboardHide();
      // we change to week view because some months spans through 6 rows which
      // makes the click event on "monthViewDayEvent" trigger the wrong link
      app.waitForElement('weekButton').click();
      app.waitForWeekView();
      app.waitForElement('weekViewEvent').click();
    });

    test('should display the created event in read-only view', function() {
      var actual = app.getViewEventEvent();
      assert.deepEqual(actual, {
        calendar: 'Offline calendar',
        title: sourceData.title,
        location: sourceData.location,
        description: sourceData.description
      }, 'event data should match');
    });

    test('should not overflow title, location and description',
      function() {
        app.checkOverflow('viewEventViewTitle', 'title');
        app.checkOverflow('viewEventViewLocation', 'location');
        app.checkOverflow('viewEventViewDescription', 'description');
      });

  });

});
