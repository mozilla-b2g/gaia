var Calendar = require('./calendar'),
    assert = require('assert');


// test is disabled see: Bug 919066
marionette('creating an event', function() {
  var app;
  var client = marionette.client();

  var startDate = new Date(), endDate = new Date();
  startDate.setDate(1);
  endDate.setTime(startDate.getTime() + 60 * 60 * 1000 /* one hour */);
  var event = {
    title: 'Puppy Bowl',
    location: 'Animal Planet',
    startDate: startDate,
    endDate: endDate
  };

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
  });

  suite('vanilla event', function() {
    setup(function() {
      app.createEvent(event);

      // Wait until we return to the base, month view.
      client.waitFor(function() {
        return app.isMonthViewActive();
      });
    });

    test('should show event in month view', function() {
      // TODO(gaye)
    });
  });

  suite('recurring', function() {
    setup(function() {
      event.recurrences = 'everyDay';
      app.createEvent(event);
    });

    test('should show many events in month view', function() {
      // TODO(gaye)
    });
  });
});
