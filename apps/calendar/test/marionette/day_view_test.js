'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert;

marionette('day view', function() {
  var app;
  var day;
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
    app.openDayView();
    day = app.day;
    day.waitForDisplay();
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

    test('click after event end', function() {
      // we need to actually grab the event position + height to avoid issues
      // with DST (see Bug 981441)
      var event = day.events[0];
      var body = client.findElement('body');
      var position = event.location();
      var size = event.size();

      app.actions
        .tap(body, position.x + 20, position.y + size.height + 20)
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
    var container = event.container;

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
    var currentTime = day.currentTime;

    assert.include(
      currentTime.getAttribute('className'),
      'active',
      'current-time should be active'
    );

    assert.ok(
      intersect(currentTime, day.currentHour),
      'current time should be inside current hour range'
    );

    var currentDisplayHour = day.currentDisplayHour;

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
