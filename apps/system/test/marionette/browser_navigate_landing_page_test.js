'use strict';

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser - Navigating from the landing page',
  function() {

  var client = marionette.client();

  var home, rocketbar, search, server, system;

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
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  test('navigates the landing page in place', function() {
    // Open the landing page
    client.apps.launch(search.URL);
    client.apps.switchToApp(search.URL);
    client.helper.waitForElement('body');
    client.switchToFrame();
    var nApps = system.getAppWindows().length;
    var nBrowsers = system.getBrowserWindows().length;

    system.appUrlbar.click();
    var url = server.url('sample.html');
    rocketbar.enterText(url);

    // Wait for the search app to be open.
    client.waitFor(function() {
      return (nApps + 1) === system.getAppWindows().length;
    });
    rocketbar.enterText(url + '\uE006');

    // Wait for the new browser window.
    // It should override the search app.
    client.waitFor(function() {
      return (nApps + 1) === system.getAppWindows().length;
    });

    // Navigates the landing page which used to be an app window.
    assert.equal((nBrowsers + 1), system.getBrowserWindows().length,
      'expected number of browsers');

    // Verify visual components are reset
    var sel = system.Selector;
    client.waitFor(function() {
      return !client.findElement(sel.appChromeWindowsButton).displayed();
    });
    client.waitFor(function() {
      return system.appUrlbar.text().indexOf('Sample page') === 0;
    });
    assert.ok(system.appChromeReloadButton.displayed());
    assert.ok(!client.findElement(sel.appChromeBack).displayed());
  });
});
