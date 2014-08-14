'use strict';

var assert = require('assert');
var Actions = require('marionette-client').Actions;
var Home = require(
  '../../../../apps/verticalhome/test/marionette/lib/home2');
var Search = require(
  '../../../../apps/search/test/marionette/lib/search');
var System = require('./lib/system');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser Chrome - Open New Window', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  var actions, home, rocketbar, search, system;

  setup(function() {
    actions = new Actions(client);
    home = new Home(client);
    rocketbar = new Rocketbar(client);
    search = new Search(client);
    system = new System(client);
    system.waitForStartup();

    search.removeGeolocationPermission();
  });

  test('open new window', function() {
    // Use the home-screen search box to open up the system browser
    rocketbar.homescreenFocus();
    rocketbar.enterText('mozilla.org\uE006');

    // Count the number of currently open apps
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
    assert(system.getAppWindows().length === nApps + 1);
  });
});
