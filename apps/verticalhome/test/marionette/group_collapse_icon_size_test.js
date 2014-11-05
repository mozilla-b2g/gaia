'use strict';

var Actions = require('marionette-client').Actions;
var assert = require('assert');

var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Group', function() {

  var client = marionette.client(Home2.clientOptionsWithGroups);
  var actions, home, system;

  setup(function() {
    actions = new Actions(client);
    home = new Home2(client);
    system = new System(client);
    system.waitForStartup();

    client.apps.launch(Home2.URL);
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
    var icon = client.helper.waitForElement(Home2.Selectors.firstIcon);
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
