var Calendar = require('./calendar'),
    Marionette = require('marionette-client');
    assert = require('assert');

marionette('go to week view', function() {
  var app,
      actions,
      bodyElement,
      hintSwipeToNavigate,
      client = marionette.client();

  setup(function() {
    actions = new Marionette.Actions(client);
    app = new Calendar(client);

    app.launch();
    bodyElement = client.findElement('body');
    // Hide the hint.
    app.hintSwipeToNavigate.click();
    // Go to week view.
    app.weekButton.click();
  });

  test('shoud have a space between months', function() {
    var monthYearHeader = app.monthYearHeader.text();
    // The pattern is like "Month1 Month2 YYYY".
    var headerPattern = /^[JFMASOND][a-z]+\s[JFMASOND][a-z]+\s\d{4}/;
    var bodySize, x1, y1, x2, y2;

    // Get the size of body element.
    client.executeScript(
      function() {
        return {
                 width: document.body.clientWidth,
                 height: document.body.clientHeight
               };
      },
      function(error, result) {
        bodySize = result;
      }
    );

    // The beginning point of swiping.
    x1 = bodySize.width * 0.2;
    y1 = bodySize.height * 0.2;
    // The ending point of swiping.
    x2 = 0;
    y2 = bodySize.height * 0.2;

    while (!monthYearHeader.match(headerPattern)) {
      // Swipe for moving to next week.
      actions.
        flick(bodyElement, x1, y1, x2, y2).
        perform();
      monthYearHeader = app.monthYearHeader.text();
    }
    assert.ok(monthYearHeader.match(headerPattern));
  });
});
