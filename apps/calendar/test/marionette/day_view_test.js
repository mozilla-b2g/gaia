'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert;

marionette('day view', function() {
  var app;
  var day;
  var client = marionette.client();

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

    // disabled bug 988516
    test.skip('click after first hour', function() {
      // click will happen at middle of element and middle is after first hour,
      // so this should be enough to trigger the event details (Bug 972666)
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

});
