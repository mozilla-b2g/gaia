'use strict';

marionette('Vertical - Group', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
  var actions, home, system;

  setup(function() {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    system.waitForStartup();

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
    var group = client.findElement(home.Selectors.group);
    var collapse = client.findElement(home.Selectors.groupToggle);

    // Enter edit mode
    home.enterEditMode();
    var header = client.helper.waitForElement(home.Selectors.editHeaderText);

    // Drag icon to its own group
    actions.press(firstIcon).wait(1).move(header).release().perform();
    home.waitForDragFinish();

    // Collapse the original group
    actions.tap(collapse).perform();
    home.waitForCollapseState(group, true);

    // Count the number of collapsed icons
    var collapsedIconsSelector = '#icons div.icon.collapsed';
    var collapsedIconsBefore =
      client.findElements(collapsedIconsSelector).length;

    // Drag icon into collapsed group
    firstIcon.scriptWith(scrollIntoView);
    actions.press(firstIcon).wait(1).move(secondIcon).release().perform();

    // Make sure there's one more collapsed icon
    client.waitFor(function() {
      var collapsedIconsAfter =
        client.findElements(collapsedIconsSelector).length;
      return collapsedIconsAfter === collapsedIconsBefore + 1;
    });
  });
});
