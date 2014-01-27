var Calendar = require('./calendar'),
    assert = require('chai').assert;


// test is disabled see: Bug 919066
marionette('creating an event', function() {
  var app;
  var client = marionette.client();

  // we always use today as base day to make test simpler, we also
  // set the hours/minutes so it always shows up at first hours of event list
  // (avoids conflicts with click events)
  var startDate = new Date(), endDate = new Date();
  startDate.setHours(2);
  startDate.setMinutes(0);
  startDate.setSeconds(0);
  startDate.setMilliseconds(0);
  endDate.setTime(startDate.getTime() + 60 * 60 * 1000 /* one hour */);
  var sourceData = {
    title: 'Puppy Bowl',
    location: 'Animal Planet',
    description: 'lorem ipsum dolor sit amet maecennas ullamcor',
    startDate: startDate,
    endDate: endDate
  };

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
  });

  suite('vanilla event', function() {
    setup(function() {
      app.createEvent(sourceData);

      // Wait until we return to the base, month view.
      client.waitFor(function() {
        return app.isMonthViewActive();
      });
    });

    test('should show event in month view', function() {
      var event = app.waitForElement('monthViewDayEvent');
      var title = app.waitForChild(event, 'monthViewDayEventName');
      var location = app.waitForChild(event, 'monthViewDayEventLocation');
      assert.equal(title.text(), sourceData.title);
      assert.equal(location.text(), sourceData.location);
    });

    suite('view event', function() {
      setup(function() {
        var week = app.waitForElement('weekButton');
        week.click();
        client.waitFor(function() {
          return app.isWeekViewActive();
        });
      });

      test('week view should be active', function() {
        assert.ok(app.isWeekViewActive());
      });
    });
  });
});
