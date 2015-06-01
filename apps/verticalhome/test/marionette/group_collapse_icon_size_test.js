'use strict';

var assert = require('assert');

marionette('Vertical - Group', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
  var actions, home, system;

  setup(function() {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    client.apps.launch(home.URL);
    home.waitForLaunch();
  });

  test('check collapsed icon size vs. column width', function() {
    function getRect(el) {
      return el.getBoundingClientRect();
    }

    // Collapse the first group
    var collapse = client.findElement('.group .toggle');
    actions.tap(collapse).wait(1).perform();

    // Store the collapsed icon size
    var icon = client.helper.waitForElement(home.Selectors.firstIcon);
    var rect3col = icon.scriptWith(getRect);

    // Change the column width
    client.executeScript(function() {
      window.wrappedJSObject.verticalPreferences.put('grid.cols', 4);
    });

    actions.wait(1).perform();
    var rect4col = icon.scriptWith(getRect);

    // Assert that the icons are the same size
    assert.equal(rect3col.width, rect4col.width);
    assert.equal(rect3col.height, rect4col.height);
  });
});
