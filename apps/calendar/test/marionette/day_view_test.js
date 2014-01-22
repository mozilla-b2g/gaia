var Calendar = require('./calendar'),
    Marionette = require('marionette-client');
    assert = require('assert');

marionette('day view', function() {
  var app;
  var client = marionette.client();

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
    // Go to day view
    app.findElement('dayButton').click();
    client.waitFor(app.isDayViewActive.bind(app));
  });

  test('header copy should not overflow', function() {
    assert.doesNotThrow(app.checkOverflow.bind(app, 'monthYearHeader'));
  });
});
