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
    system.waitForStartup();

    client.apps.launch(home.URL);
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
    var icon = client.helper.waitForElement(home.Selectors.firstIcon);
    var rectBefore = icon.scriptWith(getRect);

    // Enter edit mode
    home.enterEditMode();
    var header = client.helper.waitForElement(home.Selectors.editHeaderText);

    // Drag icon to its own group before collapsing (to test alignment)
    actions.press(icon).wait(1).move(header).release().perform();
    client.helper.waitForElement(home.Selectors.editHeaderDone).click();

    // Collapse group
    var collapse = client.findElements(home.Selectors.groupToggle).pop();
    collapse.scriptWith(scrollIntoView);
    actions.wait(1).tap(collapse).wait(1).perform();

    // Retrieve the metrics of the first icon after collapsing
    var rectAfter = icon.scriptWith(getRect);

    // Make sure that the icon got smaller and that it's left-aligned
    assert.ok(rectAfter.width < rectBefore.width);
    assert.ok(rectAfter.x < rectAfter.width);
  });
});
