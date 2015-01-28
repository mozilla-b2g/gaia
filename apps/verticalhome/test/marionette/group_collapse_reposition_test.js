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

  test('icons reposition when dragging an expanded group', function() {
    function getRect(el) {
      return el.getBoundingClientRect();
    }

    function scrollIntoView(el) {
      el.scrollIntoView(false);
    }

    // Enter edit mode
    home.enterEditMode();
    var header = client.helper.waitForElement(home.Selectors.editHeaderText);

    // Drag icon to its own group above the second icon
    var icon = client.helper.waitForElement(home.Selectors.firstIcon);
    actions.press(icon).wait(1).move(header).release().wait(1).perform();

    // Record metrics of second icon before collapsing the group above it
    var secondIcon = client.findElements(home.Selectors.firstIcon)[1];
    var rectBefore = secondIcon.scriptWith(getRect);

    // Collapse group by long-pressing (but don't let go)
    var groupGripper = client.findElements(home.Selectors.groupGripper).pop();
    groupGripper.scriptWith(scrollIntoView);
    actions.press(groupGripper).perform();

    // Wait for the second icon to fill the space now left by collapsing.
    client.waitFor(function() {
      var rectAfter = secondIcon.scriptWith(getRect);
      return rectAfter.y < rectBefore.y;
    });
  });
});
