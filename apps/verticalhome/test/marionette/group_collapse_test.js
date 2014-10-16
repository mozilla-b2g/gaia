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

  test('collapse the first group', function() {
    function getRect(el) {
      return el.getBoundingClientRect();
    }

    function scrollIntoView(el) {
      el.scrollIntoView(false);
    }

    // Store the metrics of the first icon before collapsing
    var icon = client.helper.waitForElement(Home2.Selectors.firstIcon);
    var rectBefore = icon.scriptWith(getRect);

    // Enter edit mode
    home.enterEditMode();
    var header = client.helper.waitForElement(Home2.Selectors.editHeaderText);

    // Drag icon to its own group before collapsing (to test alignment)
    actions.press(icon).wait(1).move(header).release().perform();
    client.helper.waitForElement(Home2.Selectors.editHeaderDone).click();

    // Collapse group
    var collapse = client.findElements('.group .toggle').pop();
    collapse.scriptWith(scrollIntoView);
    client.waitFor(function() { return collapse.displayed; });
    actions.tap(collapse).wait(1).perform();

    // Retrieve the metrics of the first icon after collapsing
    var rectAfter = icon.scriptWith(getRect);

    // Make sure that the icon got smaller and that it's left-aligned
    assert.ok(rectAfter.width < rectBefore.width);
    assert.ok(rectAfter.x < rectAfter.width);
  });
});
