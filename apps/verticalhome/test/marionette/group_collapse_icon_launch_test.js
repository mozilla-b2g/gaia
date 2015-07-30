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

  test('collapse the first group', function() {
    // Get a reference for the first icon
    var icon = client.helper.waitForElement(home.Selectors.firstIcon);

    // Retrieve the icon's manifest URL
    var manifestURL = icon.getAttribute('data-identifier');
    manifestURL = manifestURL.slice(0, manifestURL.lastIndexOf('-'));

    // Collapse first group
    var collapse = client.findElement(home.Selectors.groupToggle);
    actions.tap(collapse).wait(1).perform();

    // Try to launch the app
    home.launchAndSwitchToApp(manifestURL);
  });
});
