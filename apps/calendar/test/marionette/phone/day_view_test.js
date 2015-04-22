'use strict';

var Calendar = require('../lib/calendar'),
    assert = require('chai').assert;

marionette('day view', function() {
  var app;
  var day;
  var month;
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
    app.launch();
    app.openDayView();
    day = app.day;
    month = app.month;
  });

  test('header copy should not overflow', function() {
    // XXX: we don't use app.checkOverflow() because of Bug 971691
    // 20 chars is a "safe" limit if font-family is Fira Sans
    assert.operator(app.headerContent.text().length, '<', 21);
  });

  suite('events longer than 2h', function() {
    setup(function() {
      app.createEvent({
        title: 'Lorem Ipsum',
        location: 'Dolor Amet',
        startHour: 0,
        duration: 3
      });
      day.waitForDisplay();
      day.waitForHourScrollEnd(0);
    });

    test('click after first hour', function() {
      day.events[0].click();
      app.readEvent.waitForDisplay();

      assert.equal(
        app.readEvent.title,
        'Lorem Ipsum',
        'title should match'
      );
    });

    test('double tap after event end', function() {
      // we need to actually grab the event position + height to avoid issues
      // with DST (see Bug 981441)
      var event = day.events[0];
      var body = client.findElement('body');
      var position = event.location();
      var size = event.size();

      app.actions
        .doubleTap(body, position.x + 20, position.y + size.height + 20)
        .perform();

      // there is a delay between tap and view display
      app.editEvent.waitForDisplay();
    });
  });

  test('all day', function() {
    assert(day.allDayIcon.displayed(), 'should display all day icon');
  });

  test('event', function() {
    var eventData = {
      title: 'Test Day View',
      location: 'Somewhere',
      startHour: 1,
      reminders: ['5 minutes before']
    };
    app.createEvent(eventData);

    var event = day.events[0];

    assert.equal(
      event.title.text(), eventData.title, 'display event title'
    );

    assert.equal(
      event.address.text(), eventData.location, 'display location'
    );

    // calendar colors
    assert.match(
      event.cssProperty('background-color'),
      /rgba\(.+0.2\)/,
      'should set bg color'
    );

    var borderColor = event.cssProperty('border-left-color');
    assert.ok(
      borderColor,
      'should set the border color'
    );

    assert.ok(
      parseFloat(event.cssProperty('border-left-width')) > 0,
      'should have border'
    );

    assert.equal(
      event.cssProperty('border-left-style'),
      'solid',
      'should have solid border'
    );

    assert.equal(
      event.iconAlarm.cssProperty('color'),
      borderColor,
      'alarm icon color should match border color'
    );

  });

  suite('overlaps', function() {

    function createEvent(title, location) {
      app.createEvent({
        title: title,
        location: location,
        startHour: 1
      });
    }

    function eventsTitleAndLocationDisplayed() {
      return day.events.every(titleAndLocationDisplayed);
    }

    function titleAndLocationDisplayed(event) {
      return checkDisplay(event.title) &&
        checkDisplay(event.address);
    }

    function checkDisplay(el, name, i) {
      return el.text().length > 0 && el.displayed();
    }

    test('event details display', function() {
      createEvent('1 Overlap', 'Somewhere');
      createEvent('2 Overlap', 'Somewhere Else');
      createEvent('3 Overlap', 'Here');
      createEvent('4 Overlap', 'There');

      assert.ok(
        eventsTitleAndLocationDisplayed(),
        'details should be displayed if we have less than 5 events overlaps'
      );

      createEvent('5 Overlap', 'Earth');

      assert.isFalse(
        eventsTitleAndLocationDisplayed(),
        'details should be hidden if we have more than 4 events overlaps'
      );

      createEvent('6 Overlap', 'Mars');
      createEvent('7 Overlap', 'Mind');

      assert.isFalse(
        eventsTitleAndLocationDisplayed(),
        'details should be hidden if we have more than 4 events overlaps'
      );
    });

  });

  test('current-time', function() {
    day.waitForHourScrollEnd();

    var currentTime = day.currentTime;

    assert.ok(
      currentTime.displayed(),
      'current-time should be active'
    );

    assert.ok(
      intersect(currentTime, day.currentHour),
      'current time should be inside current hour range'
    );

    assert.ok(
      !day.currentDisplayHour.displayed(),
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
      return !currentTime.displayed() && day.currentDisplayHour.displayed();
    });
  });

  suite('animated scrolling', function() {
    setup(function() {
      day.waitForHourScrollEnd();
    });

    test('today', function() {
      assert.equal(
        day.scrollTop,
        day.getDestinationScrollTop(new Date().getHours() - 1),
        'scroll to the previous hour of current time'
      );
    });

    test('select next or previous day in the month', function() {
      var today = new Date();
      var selectedDay;

      app.openMonthView();
      if (today.getDate() === 1 && today.getDay() === 0) {
        selectedDay = month.days[1];
      } else {
        selectedDay = month.days[0];
      }
      selectedDay.click();

      app.openDayView();
      day.waitForHourScrollEnd();
      assert.equal(
        day.scrollTop,
        day.getDestinationScrollTop(8),
        'scroll to the 8AM element'
      );
    });

    test('swipe to the next day', function() {
      var previousScrollTop = day.scrollTop;
      app.swipeLeft();

      assert.equal(
        day.scrollTop,
        previousScrollTop,
        'same scrollTop'
      );
    });

    test('swipe to the previous day', function() {
      var previousScrollTop = day.scrollTop;
      app.swipeRight();

      assert.equal(
        day.scrollTop,
        previousScrollTop,
        'same scrollTop'
      );
    });

    test('swipe to the today', function() {
      app.swipeRight();
      app.swipeLeft();

      assert.equal(
        day.scrollTop,
        day.getDestinationScrollTop(new Date().getHours() - 1),
        'scroll to the 8AM element'
      );
    });
  });

  suite('12/24 hour format', function() {
    test('default format: 12 hour', function() {
      assert.equal(day.sideBarHours[0].text(), '12 AM');
      assert.equal(day.sideBarHours[13].text(), '1 PM');
      assert.equal(day.sideBarHours[23].text(), '11 PM');

      var now = new Date();
      var minutes = now.getMinutes();
      minutes = minutes < 10 ? (0 + String(minutes)) : minutes;
      var hours = now.getHours();
      var currentTime = (hours > 12 ? hours - 12 : hours ) + ':' + minutes;
      assert.equal(day.currentTime.text(), currentTime);
    });

    test('switch to 24 hour format', function() {
      app.switch24HourTimeFormat();

      // Settings changes are async, so we might need waitFor() the
      // UI components to update.
      client.waitFor(function() {
        return day.sideBarHours[0].text() === '0' &&
          day.sideBarHours[13].text() === '13' &&
          day.sideBarHours[23].text() === '23';
      });

      var now = new Date();
      var currentTime = pad(now.getHours()) + ':' + pad(now.getMinutes());
      assert.equal(day.currentTime.text(), currentTime);
    });
  });

  test('double tap all day + toggle all day', function() {
    day.waitForHourScrollEnd();

    day.actions
      .doubleTap(day.activeAllDays[0], 150, 30)
      .perform();

    var event = app.editEvent;
    event.waitForDisplay();
    assert.ok(event.allDay, 'is all day event');
    var oldStart = event.startTime;
    var oldEnd = event.endTime;
    event.allDay = false;
    event.title = 'Foo';
    client.waitFor(function() {
      return event.startTime !== oldStart && event.endTime !== oldEnd;
    });
    var now = new Date();
    var start = new Date(now.getTime());
    start.setHours(now.getHours() + 1, 0, 0, 0);
    var end = new Date(start.getTime());
    end.setHours(start.getHours() + 1, 0, 0, 0);
    var isToday = start.toISOString().slice(0, 10) === event.startDate;
    var expectedStart = isToday ? pad(start.getHours()) + ':00:00' : '08:00:00';
    var expectedEnd = isToday ? pad(end.getHours()) + ':00:00' : '09:00:00';
    assert.equal(event.startTime, expectedStart, 'startTime');
    assert.equal(event.endTime, expectedEnd, 'endTime');

    event.save();
    day.waitForDisplay();
  });

  function pad(n) {
    return n < 10 ? '0' + n : String(n);
  }
});
