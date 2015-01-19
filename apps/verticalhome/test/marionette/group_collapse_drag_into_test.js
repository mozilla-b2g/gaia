'use strict';

var assert = require('assert');

marionette('Vertical - Group', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
  var actions, home, system;

  setup(function() {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    client.apps.launch(home.URL);
    home.waitForLaunch();
  });

  test('check dragging icon into collapsed group', function() {
    function scrollIntoView(el) {
      el.scrollIntoView(false);
    }

    // Store a reference to the first icon
    var firstIcon = client.helper.waitForElement(home.Selectors.firstIcon);
    var secondIcon = client.findElements(home.Selectors.firstIcon)[1];
    var collapse = client.findElement('.group .toggle');

    // Enter edit mode
    home.enterEditMode();
    var header = client.helper.waitForElement(home.Selectors.editHeaderText);

    // Drag icon to its own group
    actions.press(firstIcon).wait(1).move(header).release().wait(1).perform();

    // Collapse the original group
    actions.tap(collapse).wait(1).perform();

    // Count the number of collapsed icons
    var collapsedIconsSelector = '#icons div.icon.collapsed';
    var collapsedIconsBefore =
      client.findElements(collapsedIconsSelector).length;

    // Drag icon into collapsed group
    firstIcon.scriptWith(scrollIntoView);
    actions.press(firstIcon).wait(1).move(secondIcon).release().
      wait(1).perform();

    // Make sure there's one more collapsed icon
    var collapsedIconsAfter =
      client.findElements(collapsedIconsSelector).length;
    assert.equal(collapsedIconsAfter, collapsedIconsBefore + 1);
  });
});
