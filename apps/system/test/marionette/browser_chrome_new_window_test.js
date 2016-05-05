'use strict';

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');
var CLOCK_APP = 'app://clock.gaiamobile.org';
var NEW_WINDOW = 'chrome://gaia/content/search/newtab.html?private=0';

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
  });

  test('open new window', function() {
    // Use the home-screen search box to open up the system browser
    var url = server.url('sample.html');
    rocketbar.homescreenFocus();
    rocketbar.enterText(url, true);
    system.waitForBrowser(url);

    // Count the number of currently open app windows (shoud be 3)
    var nApps = system.getAppWindows().length;

    // Open the context menu and click open new window
    client.switchToFrame();
    system.appChromeContextLink.click();
    assert.ok(system.appChromeContextMenu.displayed());

    var newWindowLink = system.appChromeContextMenuNewWindow;
    assert.ok(newWindowLink.displayed());

    newWindowLink.click();

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

    // Open the context menu and click open new window
    system.appChromeContextLink.click();
    assert.ok(system.appChromeContextMenu.displayed());

    var newWindowLink = system.appChromeContextMenuNewWindow;
    assert.ok(newWindowLink.displayed());

    // Deferring click event to ensure that the new window is not already there
    // when flicking starts.
    // 200ms is a carefully selected value for slow and fast test nodes.
    // If clicking happens too early, the new window is alredy there when
    // flicking starts -> the test will fail, as its intent is to check,
    // weather swiping back interrupts a new window action.
    // If clicking happens too late, the flicking already runs -> this could
    // fail and invalidate the test scenario, as a user will not (be able to)
    // tap the new window button during a swipe gesture.
    newWindowLink.scriptWith(function(el) {
      setTimeout(function() { el.click(); }, 200);
    });

    // This flicking has to happen as fast/soon as possible to ensure that the
    // resulting swipe gesture will interrupt opening the window;
    // 20ms is still enough time for swipe gesture recognition
    actions.flick(system.leftPanel, 0, 50, 100, 50, 20).perform();

    client.waitFor(function() {
      return system.getActiveAppName() === 'Clock';
    });

    assert(system.getAppIframe(CLOCK_APP).displayed());

    // Check that both are not displayed at the same time
    assert(!system.getAppIframe(NEW_WINDOW).displayed());
  });
});
