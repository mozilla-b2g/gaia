'use strict';

marionette('Vertical - Group', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js'),
    desiredCapabilities: { raisesAccessibilityExceptions: true }
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

  test('check dragging icon into collapsed group', function() {
    function scrollIntoView(el) {
      el.scrollIntoView(false);
    }

    // Store a reference to the first icon
    var firstIcon = client.helper.waitForElement(home.Selectors.firstIcon);

    // Enter edit mode
    home.enterEditMode();
    var header = client.helper.waitForElement(home.Selectors.editHeaderText);

    // Drag icon to its own group
    actions.press(firstIcon).wait(1).move(header).release().wait(1).perform();

    // Leave edit mode
    home.exitEditMode();

    // Collapse new group
    var toggle = client.findElements(home.Selectors.groupToggle).pop();
    toggle.scriptWith(scrollIntoView);
    actions.tap(toggle).wait(1).perform();

    // Long-press the home-screen in the middle of the collapsed group
    var groupBg = client.findElements(home.Selectors.groupBackground).pop();
    var grid = client.findElement(home.Selectors.grid);
    var x = groupBg.location().x + groupBg.size().width/2;
    var y = groupBg.location().y + groupBg.size().height/2;
    actions.press(grid, x, y).wait(1).perform();

    // Wait for the context menu to appear
    client.helper.waitForElement(home.contextMenu);
  });
});
