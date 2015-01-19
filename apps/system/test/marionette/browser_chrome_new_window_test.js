'use strict';

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser Chrome - Open New Window', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    }
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
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  test('open new window', function() {
    // Use the home-screen search box to open up the system browser
    var url = server.url('sample.html');
    rocketbar.homescreenFocus();
    rocketbar.enterText(url + '\uE006');

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
    client.waitFor(function(){
      return system.getAppWindows().length === nApps + 1;
    });
  });
});
