'use strict';

var Calendar = require('./lib/calendar'),
    assert = require('chai').assert;

marionette('day view', function() {
  var app;
  var client = marionette.client();

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
    app.openDayView();
    app.day.waitForDisplay();
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
      app.day.waitForDisplay();
    });

    test('click after first hour', function() {
      app.day.events[0].click();
      app.readEvent.waitForDisplay();

      assert.equal(
        app.readEvent.waitForTextNotEmpty('title'),
        'Lorem Ipsum',
        'title should match'
      );
    });

    test('click after event end', function() {
      // we need to actually grab the event position + height to avoid issues
      // with DST (see Bug 981441)
      var event = app.day.events[0];
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

});
