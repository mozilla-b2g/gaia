'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert;

marionette('week view', function() {
  var app, week;

  var client = marionette.client({
    profile: {
      prefs: {
        // we need to disable the keyboard to avoid intermittent failures on
        // Travis (transitions might take longer to run and block UI)
        'dom.mozInputMethod.enabled': false,
        // Do not require the B2G-desktop app window to have focus (as per the
        // system window manager) in order for it to do focus-related things.
        'focusmanager.testmode': true,
      }
    }
  });

  setup(function() {
    app = new Calendar(client);
    app.launch();
    week = app.week;
    app.openWeekView();
  });

  test('hours', function() {
    var hours = week.hours;
    var i = -1, h, hour;
    var currentHour = (new Date()).getHours();
    while (++i < 24) {
      h = i % 12 || 12;
      hour = hours[i];
      var text = h + '\n' + (i < 12 ? 'AM' : 'PM');
      // current hour is hidden because "current time" line overlaps it!
      if (i === currentHour) {
        text = '';
      }
      assert.strictEqual(hour.text(), text, 'hour text');
    }
  });

  test('swipe should change date', function() {
    var prevText = app.headerContent.text();
    var swipeCount = 0;
    var headerCount = 0;
    var multiMonthCount = 0;
    // match the header on a multi week view, we just check for 2 dates since
    // month names will have different patterns on each locale
    var multiMonthPattern = /\d{4}.+\d{4}$/;

    while (++swipeCount < 30) {
      var text = app.headerContent.text();

      // we are not checking for real overflow since font is different on each
      // environment (Travis uses a wider font) which would make test to fail
      // https://groups.google.com/forum/#!topic/mozilla.dev.gaia/DrQzv7qexw4
      assert.operator(text.length, '<', 21, 'header should not overflow');

      if (multiMonthPattern.test(text)) {
        multiMonthCount += 1;
      }

      // jshint -W083
      // there was a bug during implementation that caused week view to add
      // duplicate dates to the DOM, checking if the days have a different
      // "name" should be enough to catch regressions
      var duplicateNames = week.dayNames.filter(function(name, i, arr) {
        return arr.indexOf(name, i + 1) !== -1;
      });
      assert.equal(duplicateNames.join(', '), '', 'duplicate dates');
      // jshint +W083

      if (prevText !== text) {
        prevText = text;
        headerCount += 1;
      }

      app.swipeLeft();
    }

    assert.operator(headerCount, '>', 1, 'should update header at least 2x');
    assert.operator(multiMonthCount, '>', 0, 'header with multiple months');
  });

  test('event + style + scroll + click', function() {
    // "better" to do all these checks at once because of performance

    // we don't set the startHour because the view will scroll to current time
    // by default (since it's displaying today)
    var eventData = {
      title: 'Test Week View',
      location: 'Somewhere'
    };

    app.createEvent(eventData);

    // this is also enough to test if the view is scrolling to the proper
    // destination (will timeout if it doesn't end or click won't trigger on
    // proper element)
    week.waitForHourScrollEnd();

    var event = week.events[0];

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

  test('overlaps', function() {
    function eventTitlesDisplayed() {
      return week.events.every(checkDisplay);
    }

    function checkDisplay(el) {
      return el.text().length > 0 && el.displayed();
    }

    app.createEvent({
      title: '1 Overlap',
      location: 'Somewhere'
    });

    assert.ok(
      eventTitlesDisplayed(),
      'title should be displayed if no overlaps'
    );

    app.createEvent({
      title: '2 Overlap',
      location: 'Somewhere Else'
    });

    assert.isFalse(
      eventTitlesDisplayed(),
      'title should be hidden if we have overlaps'
    );

    app.createEvent({
      title: '3 Overlap',
      location: 'Here'
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
    week.waitForHourScrollEnd();

    var currentTime = week.currentTime;

    assert.ok(
      currentTime.displayed(),
      'current-time should be active'
    );

    assert.ok(
      intersect(currentTime, week.currentHour),
      'current time should be inside current hour range'
    );

    assert.ok(
      !week.currentDisplayHour.displayed(),
      'hour should be hidden if overlapping'
    );

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

    // it should hide the currentTime if current day is not visible
    app.swipeLeft();
    client.waitFor(function() {
      return !currentTime.displayed() && week.currentDisplayHour.displayed();
    });
  });

  suite('double tap', function() {
    var dateIso, time, editEvent;

    setup(function() {
      editEvent = app.editEvent;

      week.waitForHourScrollEnd();

      // we always click on the day that is in the middle of the screen
      var day = week.days[7].scriptWith(function(el) {
        return el.dataset.date;
      });
      dateIso = (new Date(day)).toISOString().slice(0, 10);

      // we always click the 3rd hour from the top
      time = Math.floor((week.scrollTop + 100) / 50);
    });

    test('fast', function() {
      week.actions
        .doubleTap(week.element, 200, 200)
        .perform();

      assertEditEvent();
    });

    test('slow + hide', function() {
      week.actions
        .tap(week.element, 200, 200)
        .perform();

      client.waitFor(function() {
        return isShowingAddEventLink();
      });

      // clicking on another hour should hide the link
      week.actions
        .tap(week.element, 200, 260)
        .perform();

      client.waitFor(function() {
        return !isShowingAddEventLink();
      });

      week.actions
        .tap(week.element, 200, 200)
        .wait(0.5)
        .tap(week.element, 200, 200)
        .perform();

      assertEditEvent();
    });

    function assertEditEvent() {
      editEvent.waitForDisplay();

      assert.equal(editEvent.startDate, dateIso, 'startDate');
      assert.equal(editEvent.endDate, dateIso, 'endDate');

      assert.equal(editEvent.startTime, pad(time) + ':00:00', 'startTime');
      assert.equal(editEvent.endTime, pad(time + 1) + ':00:00', 'endTime');
    }

    function isShowingAddEventLink() {
      return week.element.scriptWith(function(el) {
        return !!el.querySelector('.md__add-event');
      });
    }
  });

  suite('12/24 hour format', function() {
    // Refer to http://bugzil.la/1061135.
    test.skip('default format: 12 hour', function() {
      assert.equal(week.sideBarHours[0].text(), '12\nAM');
      assert.equal(week.sideBarHours[13].text(), '1\nPM');
      assert.equal(week.sideBarHours[23].text(), '11\nPM');

      var now = new Date();
      var minutes = now.getMinutes();
      minutes = minutes < 10 ? (0 + String(minutes)) : minutes;
      var currentTime = (now.getHours() % 12) + ':' + minutes;
      assert.equal(week.currentTime.text(), currentTime);
    });

    test('switch to 24 hour format', function() {
      app.switch24HourTimeFormat();
      assert.equal(week.sideBarHours[0].text(), '0');
      assert.equal(week.sideBarHours[13].text(), '13');
      assert.equal(week.sideBarHours[23].text(), '23');

      var now = new Date();
      var currentTime = pad(now.getHours()) + ':' + pad(now.getMinutes());
      assert.equal(week.currentTime.text(), currentTime);
    });
  });

  test('delete', function() {
    app.createEvent({
      title: 'Foo',
      location: 'Bar'
    });
    client.waitFor(function() {
      return app.week.events.length === 1;
    }, { timeout: 2000 });

    app.openMonthView();
    app.monthDay.events[0].click();
    app.readEvent.waitForDisplay();
    app.readEvent.edit();
    app.editEvent.waitForDisplay();
    app.editEvent.delete();
    app.month.waitForDisplay();
    app.openWeekView();

    client.waitFor(function() {
      return app.week.events.length === 0;
    }, { timeout: 2000 });
  });

  test('scroll to event', function() {
    week.waitForHourScrollEnd();
    week.scrollToTop();

    var startDate = new Date();
    startDate.setHours(13, 0, 0, 0);

    app.createEvent({
      title: 'Test Week View',
      location: 'Somewhere',
      startDate: startDate
    });

    week.waitForDisplay();

    // scroll to 1h before event
    week.waitForHourScrollEnd(12);
  });

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }
});
