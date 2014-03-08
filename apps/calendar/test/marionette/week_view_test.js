'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert;

marionette('week view', function() {
  var app;
  var client = marionette.client();

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
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

    // Go to week view.
    app.findElement('weekButton').click();
    app.waitForWeekView();
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
    var event, container;
    var eventData = {
      title: 'Test Week View',
      location: 'Somewhere'
    };

    setup(function() {
      app.createEvent(eventData);
      event = app.findElement('weekViewEvent');
      container = app.findElement('weekViewEventContainer');
    });

    test('style', function() {
      assert.equal(container.text(), eventData.title, 'display event title');

      assert.match(
        event.cssProperty('background-color'),
        /rgba\(.+0.2\)/,
        'should set bg color'
      );

      assert.ok(
        event.cssProperty('border-left-color'),
        'should set the border color'
      );

      assert.ok(
        parseFloat(event.cssProperty('border-left-width')) > 0,
        'should have border left width'
      );

      assert.equal(
        event.cssProperty('border-left-style'),
        'solid',
        'should have solid border'
      );
    });

    test('click + event details', function() {
      event.click();
      var title = app.waitForElement('viewEventViewTitleContent');
      assert.equal(title.text(), eventData.title, 'title');
      var location = app.waitForElement('viewEventViewLocationContent');
      assert.equal(location.text(), eventData.location, 'location');
    });
  });


  test('overlaps', function() {
    function eventsTitleDisplayed() {
      var events = app.findElements('weekViewEventContainer');
      return events.every(checkDisplay);
    }

    function checkDisplay(el) {
      return el.text().length > 0 && el.displayed();
    }

    app.createEvent({
      title: '1 Overlap',
      location: 'Somewhere'
    });

    assert.ok(
      eventsTitleDisplayed(),
      'title should be displayed if no overlaps'
    );

    app.createEvent({
      title: '2 Overlap',
      location: 'Somewhere Else'
    });

    assert.isFalse(
      eventsTitleDisplayed(),
      'title should be hidden if we have overlaps'
    );

    app.createEvent({
      title: '3 Overlap',
      location: 'Here'
    });

    assert.isFalse(
      eventsTitleDisplayed(),
      'title should be hidden if we have overlaps'
    );

  });

});
