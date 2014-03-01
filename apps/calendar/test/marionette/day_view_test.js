var Calendar = require('./calendar'),
    Marionette = require('marionette-client'),
    assert = require('chai').assert;

marionette('day view', function() {
  var app;
  var client = marionette.client();

  setup(function() {
    app = new Calendar(client);
    app.launch({ hideSwipeHint: true });
    // Go to day view
    app.waitForElement('dayButton').click();
    client.waitFor(app.isDayViewActive.bind(app));
  });

  test('header copy should not overflow', function() {
    var header = app.waitForElement('monthYearHeader');
    // XXX: we don't use app.checkOverflow() because of Bug 971691
    // 20 chars is a "safe" limit if font-family is Fira Sans
    assert.operator(header.text().length, '<', 21);
  });
});
