var Calendar = require('./calendar'),
    Marionette = require('marionette-client');
    assert = require('assert');

marionette('week view', function() {
  var app, actions, bodyElement, hintSwipeToNavigate;
  var client = marionette.client();

  setup(function() {
    actions = new Marionette.Actions(client);
    app = new Calendar(client);

    app.launch();
    bodyElement = client.findElement('body');

    // Hide the hint.
    app.findElement('hintSwipeToNavigate').click();

    // Go to week view.
    app.findElement('weekButton').click();
  });

  test('should have a space between months', function(done) {
    var bodySize = client.executeScript(function() {
      return {
        height: document.body.clientHeight,
        width: document.body.clientWidth
      };
    });

    // (x1, y1) is swipe start.
    // (x2, y2) is swipe end.
    var x1 = bodySize.width * 0.2,
        y1 = bodySize.height * 0.2,
        x2 = 0,
        y2 = bodySize.height * 0.2;

    var header;
    do {
      // Swipe to next week.
      actions
        .flick(bodyElement, x1, y1, x2, y2)
        .perform();
      header = app.findElement('monthYearHeader');
    } while (!Calendar.HEADER_PATTERN.test(header.text()));

    // We've reached some week view where the header is split between
    // two months... this is good!
    done();
  });
});
