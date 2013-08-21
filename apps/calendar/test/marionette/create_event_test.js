var Calendar = require('./calendar'),
    assert = require('assert');


marionette('creating an event', function() {
  var client = marionette.client();

  var app, expected;
  setup(function(done) {
    app = new Calendar(client);
    app.launch();

    // Get the day's events at the bottom of the month view.
    var events = app.monthViewDayEvents;

    // There shouldn't be any events yet.
    assert.strictEqual(events.length, 0);

    // Create an event!
    expected = app.createEvent();

    // Wait until we return to the base, month view.
    var active = app.isMonthViewActive.bind(app, client);
    client.helper.waitFor(active, done);
  });

  test('should make an event visible in the month day view', function() {
    // Get the day's events at the bottom of the month view.
    var els = app.monthViewDayEvents;

    // There should now be a single event.
    assert.strictEqual(els.length, 1);
  });

  test('should display the created event in read-only view', function(done) {
    // Get the day's events at the bottom of the month view.
    var els = app.monthViewDayEvents;

    // Click on the event.
    var el = els[0];
    el.click();

    // Wait until we see the read-only event view.
    var active = app.isViewEventViewActive.bind(app, client);
    client.helper.waitFor(active, function() {
      // Verify event's details to make sure they were set correctly.
      var actual = app.getViewEventEvent();
      assert.deepEqual(actual, expected);
      done();
    });
  });
});
