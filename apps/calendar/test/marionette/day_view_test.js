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

  suite('create event', function(){
    setup(function() {
      app.createEvent({
        title: 'Foo',
        location: 'Bar',
        startHour: 1,
        duration: 1
      });
      app.waitForDayView();
    });

    test('should not create unnecessary day views', function() {
      var events = client.findElements('#day-view .event');
      assert.equal(events.length, 1);
    });
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

    // disabled bug 988516
    test.skip('click after first hour', function() {
      // click will happen at middle of element and middle is after first hour,
      // so this should be enough to trigger the event details (Bug 972666)
      app.findElement('dayViewEvent').click();

      app.waitForViewEventView();

      var title = app.findElement('viewEventViewTitle');

      assert.equal(
        title.text(),
        'Lorem Ipsum',
        'title should match'
      );
    });

    test('click after event end', function() {
      // we need to actually grab the event position + height to avoid issues
      // with DST (see Bug 981441)
      var event = app.findElement('dayViewEvent');
      var body = client.findElement('body');
      var position = event.location();
      var size = event.size();

      app.actions
        .tap(body, position.x + 20, position.y + size.height + 20)
        .perform();

      // there is a delay between tap and view display
      app.waitForAddEventView();
    });
  });

});
