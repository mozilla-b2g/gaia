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
  });

  test.skip('header copy should not overflow', function() {
    var header = app.findElement('monthYearHeader');
    var wid = header.scriptWith(function(el) {
      return {
        content: el.scrollWidth,
        container: el.getBoundingClientRect().width
      };
    });
    // we need to check the widths are != 0 since element might be hidden
    assert.ok(wid.content, 'content width is not valid');
    assert.ok(wid.container, 'container width is not valid');
    assert.equal(wid.content, wid.container,
      'content is bigger than container');
  });
});
