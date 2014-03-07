'use strict';

var Calendar = require('./calendar'),
    assert = require('chai').assert;

marionette('day view', function() {
  var app;
  var client = marionette.client();

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
    // Go to day view
    app.waitForElement('dayButton').click();
    client.waitFor(app.isDayViewActive.bind(app));
  });

  test('header copy should not overflow', function() {
    assert.doesNotThrow(app.checkOverflow.bind(app, 'monthYearHeader'));
  });

  test('all day', function() {
    var el = app.findElement('dayViewAllDayIcon');
    assert(el.displayed(), 'should display all day icon');
  });

  test('event', function() {
    var eventData = {
      title: 'Test Day View',
      location: 'Somewhere'
    };
    createEvent(eventData);

    var event = app.findElement('dayViewEvent');
    var container = app.findElement('dayViewEventContainer');

    var title = app.findElement('dayViewEventTitle');
    assert.equal(title.text(), eventData.title, 'display event title');

    var location = app.findElement('dayViewEventLocation');
    assert.equal(location.text(), eventData.location, 'display location');

    // calendar colors
    assert.match(
      event.cssProperty('background-color'),
      /rgba\(.+0.2\)/,
      'should set bg color'
    );

    var borderColor = container.cssProperty('border-left-color');
    assert.ok(
      borderColor,
      'should set the border color'
    );

    assert.ok(
      parseFloat(container.cssProperty('border-left-width')) > 0,
      'should have border'
    );

    assert.equal(
      container.cssProperty('border-left-style'),
      'solid',
      'should have solid border'
    );

    var iconAlarm = event.findElement('.icon-alarm');
    assert.equal(
      iconAlarm.cssProperty('color'),
      borderColor,
      'alarm icon color should match border color'
    );

  });

  test('overlaps', function() {
    createEvent({
      title: '1 Overlap',
      location: 'Somewhere'
    });
    createEvent({
      title: '2 Overlap',
      location: 'Somewhere Else'
    });
    createEvent({
      title: '3 Overlap',
      location: 'Here'
    });
    createEvent({
      title: '4 Overlap',
      location: 'There'
    });

    function eventsTitleAndLocationDisplayed() {
      var events = app.findElements('dayViewEvent');
      return events.every(titleAndLocationDisplayed);
    }

    function titleAndLocationDisplayed(event) {
      return checkDisplay(event.findElement('h5')) &&
        checkDisplay(event.findElement('.location'));
    }

    function checkDisplay(el, name, i) {
      return el.text().length > 0 && el.displayed();
    }

    assert.ok(
      eventsTitleAndLocationDisplayed(),
      'details should be displayed if we have less than 5 events overlaps'
    );

    createEvent({
      title: '5 Overlap',
      location: 'Earth'
    });

    assert.isFalse(
      eventsTitleAndLocationDisplayed(),
      'details should be hidden if we have more than 4 events overlaps'
    );

    createEvent({
      title: '6 Overlap',
      location: 'Mars'
    });

    createEvent({
      title: '7 Overlap',
      location: 'Mind'
    });

    assert.isFalse(
      eventsTitleAndLocationDisplayed(),
      'details should be hidden if we have more than 4 events overlaps'
    );

  });

  // FIXME: remove this method after rebasing over master, app.createEvent
  // nowadays support "startHour" and "duration" so this logic is redundant
  function createEvent(eventData) {
    // we always use today as base day to make test simpler, we also
    // set the hours/minutes so it always shows up at first hours of event list
    // (avoids conflicts with click events)
    var startDate = new Date(), endDate = new Date();
    startDate.setHours(2);
    startDate.setMinutes(0);
    startDate.setSeconds(0);
    startDate.setMilliseconds(0);
    endDate.setTime(startDate.getTime() + 60 * 60 * 1000 /* one hour */);
    eventData.startDate = startDate;
    eventData.endDate = endDate;
    app.createEvent(eventData);
    app.waitForKeyboardHide();
  }

});
