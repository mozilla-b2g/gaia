'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert;

marionette('week view', function() {
  var app, week;

  var client = marionette.client({
    prefs: {
      // we need to disable the keyboard to avoid intermittent failures on
      // Travis (transitions might take longer to run and block UI)
      'dom.mozInputMethod.enabled': false,
      // Do not require the B2G-desktop app window to have focus (as per the
      // system window manager) in order for it to do focus-related things.
      'focusmanager.testmode': true,
    }
  });

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
    week = app.week;
    app.openWeekView();
  });

  test('swipe should change date', function() {
    var prevText = app.headerContent.text();
    var swipeCount = 20;
    var headerCount = 0;

    while (swipeCount--) {
      app.swipeLeft();

      var text = app.headerContent.text();

      // we are not checking for real overflow since font is different on each
      // environment (Travis uses a wider font) which would make test to fail
      // https://groups.google.com/forum/#!topic/mozilla.dev.gaia/DrQzv7qexw4
      assert.operator(text.length, '<', 21, 'header should not overflow');

      if (prevText !== text) {
        prevText = text;
        headerCount += 1;
      }
    }

    assert.operator(headerCount, '>', 1, 'should update header at least 2x');
  });

  test('multiple months (eg. "Dec 2013 Jan 2014")', function() {
    // match the header on a multi week view, we just check for 2 dates since
    // month names will have different patterns on each locale
    var multiMonthPattern = /\d{4}.+\d{4}$/;
    var swipeCount = 30;
    var nMatches = 0;
    var headerText;

    while (swipeCount--) {
      headerText = app.headerContent.text();
      if (multiMonthPattern.test(headerText)) {
        nMatches += 1;
      }
      app.swipeLeft();
    }

    assert.operator(nMatches, '>', 0, 'header with multiple months');
  });

  suite('event', function() {
    var event;
    var eventData = {
      title: 'Test Week View',
      location: 'Somewhere',
      startHour: 1
    };

    setup(function() {
      app.createEvent(eventData);
      event = week.events[0];
    });

    test('style', function() {
      assert.strictEqual(
        event.text(),
        eventData.title,
        'display event title'
      );

      assert.match(
        event.cssProperty('background-color'),
        /rgba\(.+0.2\)/,
        'should set bg color'
      );

      assert.ok(
        event.cssProperty('border-left-color'),
        'should set the border color'
      );

      assert.operator(
        parseFloat(event.cssProperty('border-left-width')), '>', 0,
        'should have border left width'
      );

      assert.strictEqual(
        event.cssProperty('border-left-style'),
        'solid',
        'should have solid border'
      );
    });

    test('click + event details', function() {
      event.click();
      app.readEvent.waitForDisplay();
      assert.strictEqual(
        app.readEvent.title,
        eventData.title,
        'title'
      );
      assert.strictEqual(
        app.readEvent.location,
        eventData.location,
        'location'
      );
    });
  });

  test('overlaps', function() {
    function eventTitlesDisplayed() {
      return week.events.every(checkDisplay);
    }

    function checkDisplay(el) {
      return el.text().length > 0 && el.displayed();
    }

    app.createEvent({
      title: '1 Overlap',
      location: 'Somewhere',
      startHour: 1
    });

    assert.ok(
      eventTitlesDisplayed(),
      'title should be displayed if no overlaps'
    );

    app.createEvent({
      title: '2 Overlap',
      location: 'Somewhere Else',
      startHour: 1
    });

    assert.isFalse(
      eventTitlesDisplayed(),
      'title should be hidden if we have overlaps'
    );

    app.createEvent({
      title: '3 Overlap',
      location: 'Here',
      startHour: 1
    });

    assert.isFalse(
      eventTitlesDisplayed(),
      'title should be hidden if we have overlaps'
    );
  });

  test('today', function() {
    var todayDates = week.todayDates;
    assert.strictEqual(todayDates.length, 1, 'single date marked as today');

    // checking for style is usually a bad idea but since the class name
    // doesn't guarantee that it's being applied properly we make sure to
    // test for it as well
    var today = todayDates[0];
    assert.strictEqual(
      today.cssProperty('font-weight'),
      '500',
      'font-weight'
    );
    assert.strictEqual(
      today.cssProperty('color'),
      'rgb(0, 142, 171)',
      'text color'
    );
  });

  test('current-time', function() {
    var currentTime = week.currentTime;

    assert.include(
      currentTime.getAttribute('className'),
      'active',
      'current-time should be active'
    );

    assert.ok(
      intersect(currentTime, week.currentHour),
      'current time should be inside current hour range'
    );

    var currentDisplayHour = week.currentDisplayHour;

    if (intersect(currentTime, currentDisplayHour)) {
      assert.ok(
        !currentDisplayHour.displayed(),
        'hour should be hidden if overlapping'
      );
    } else {
      assert.ok(
        currentDisplayHour.displayed(),
        'hour should be displayed if not overlapping'
      );
    }

    function intersect(el1, el2) {
      var b1 = getBounds(el1);
      var b2 = getBounds(el2);

      return (
        b1.left <= b2.right &&
        b2.left <= b1.right &&
        b1.top <= b2.bottom &&
        b2.top <= b1.bottom
      );
    }

    function getBounds(element) {
      return element.scriptWith(function(el) {
        return el.getBoundingClientRect();
      });
    }
  });
});
