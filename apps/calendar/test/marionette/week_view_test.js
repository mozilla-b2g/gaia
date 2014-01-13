var Calendar = require('./calendar'),
    Marionette = require('marionette-client');
    assert = require('assert');

marionette('week view', function() {
  var app, hintSwipeToNavigate;
  var client = marionette.client();

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });

    // Go to week view.
    app.findElement('weekButton').click();
  });

  test('should have a space between months', function() {
    var header;
    do {
      app.swipe();
      header = app.findElement('monthYearHeader');
    } while (!Calendar.HEADER_PATTERN.test(header.text()));
  });
});
