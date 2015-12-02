'use strict';

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');
var CLOCK_APP = 'app://clock.gaiamobile.org';
var NEW_WINDOW = 'app://search.gaiamobile.org/newtab.html?private=0';

marionette('Browser Chrome - Open New Window', function() {

  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });

  var actions, home, rocketbar, search, server, system;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('homescreen');
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  function newWindow() {
    // Open the context menu and click open new window
    client.switchToFrame();
    system.appChromeContextLink.click();
    assert.ok(system.appChromeContextMenu.displayed());

    var newWindowLink = system.appChromeContextMenuNewWindow;
    assert.ok(newWindowLink.displayed());
    newWindowLink.click();
  }

  test('open new window', function() {
    // Use the home-screen search box to open up the system browser
    var url = server.url('sample.html');
    rocketbar.homescreenFocus();
    rocketbar.enterText(url, true);

    // Count the number of currently open apps
    var nApps = system.getAppWindows().length;

    newWindow();

    // Confirm that a new window was opened
    client.switchToFrame();
    client.waitFor(function() {
      return system.getAppWindows().length === nApps + 1;
    });
  });

  test('open new window and edge swipe', function() {
    home.launchIcon(home.getIcon(CLOCK_APP));
    var url = server.url('sample.html');
    rocketbar.homescreenFocus();
    rocketbar.enterText(url, true);
    system.gotoBrowser(url);
    client.switchToFrame();

    // Opening a new window and immediatly switching to
    // the previous app
    newWindow();
    actions.flick(system.leftPanel, 0, 50, 100, 50, 100).perform();

    client.waitFor(function() {
      return system.getActiveAppName() === 'Clock';
    });

    assert(system.getAppIframe(CLOCK_APP).displayed());

    // Check that both are not displayed at the same time
    assert(!system.getAppIframe(NEW_WINDOW).displayed());
  });
});
