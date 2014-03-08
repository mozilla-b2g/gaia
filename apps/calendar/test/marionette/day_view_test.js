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
    app.waitForDayView();
  });

  test('header copy should not overflow', function() {
    var header = app.waitForElement('monthYearHeader');
    // XXX: we don't use app.checkOverflow() because of Bug 971691
    // 20 chars is a "safe" limit if font-family is Fira Sans
    assert.operator(header.text().length, '<', 21);
  });

  suite('events longer than 2h', function() {
    setup(function() {
      app.createEvent({
        title: 'Lorem Ipsum',
        location: 'Dolor Amet',
        startHour: 0,
        duration: 3
      });
      app.waitForDayView();
    });

    test('click after first hour', function() {
      // click will happen at middle of element and middle is after first hour,
      // so this should be enough to trigger the event details (Bug 972666)
      client.findElement('#day-view .active .day-events .hour-2').click();

      app.waitForViewEventView();

      var title = app.findElement('viewEventViewTitle');

      assert.equal(
        title.text(),
        'Lorem Ipsum',
        'title should match'
      );
    });

    test('click after event end', function() {
      // click will happen at middle of element so this should be enough to
      // trigger the create event (since .hour-3 is after event duration)
      client.findElement('#day-view .active .day-events .hour-3').click();
      assert.ok(app.isAddEventViewActive(), 'should go to add event view');
    });
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
    app.createEvent(eventData);

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
    app.createEvent({
      title: '1 Overlap',
      location: 'Somewhere'
    });
    app.createEvent({
      title: '2 Overlap',
      location: 'Somewhere Else'
    });
    app.createEvent({
      title: '3 Overlap',
      location: 'Here'
    });
    app.createEvent({
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

    app.createEvent({
      title: '5 Overlap',
      location: 'Earth'
    });

    assert.isFalse(
      eventsTitleAndLocationDisplayed(),
      'details should be hidden if we have more than 4 events overlaps'
    );

    app.createEvent({
      title: '6 Overlap',
      location: 'Mars'
    });

    app.createEvent({
      title: '7 Overlap',
      location: 'Mind'
    });

    assert.isFalse(
      eventsTitleAndLocationDisplayed(),
      'details should be hidden if we have more than 4 events overlaps'
    );

  });

});
