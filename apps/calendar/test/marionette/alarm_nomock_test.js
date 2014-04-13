'use strict';

var Calendar = require('./lib/calendar');

marionette('alarm without calendar mocks', function() {
  var app;
  var client = marionette.client();

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
  });

  suite('create two events with simultaneous reminders', function() {
    setup(function() {
      var startTime = Date.now() + 5000; // 5 seconds in future
      app.createEvent({
        title: 'First Event',
        startDate: new Date(startTime),
        reminders: ['At time of event']
      });
      app.createEvent({
        title: 'Second Event',
        startDate: new Date(startTime),
        reminders: ['At time of event']
      });
    });

    test('both events trigger notifications', function() {
      client.switchToFrame();
      client.waitFor(function() {
        var notificationSelector = '#desktop-notifications-container > div';
        return client.findElements(notificationSelector).length > 1;
      });
    });
  });
});

