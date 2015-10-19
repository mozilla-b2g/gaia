'use strict';

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser - Launch a URL navigates the same window',
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

  test('opens a new sheet with window.open()', function() {
    var url = server.url('sample.html');

    // Open the first URL in a sheet.
    rocketbar.homescreenFocus();
    rocketbar.enterText(url, true);

    // Switch to the app, and navigate to a different url.
    system.gotoBrowser(url);

    client.switchToFrame();
    var nApps = system.getAppWindows().length;

    // Navigate to a page (just a fixture we have sitting around.)
    var nextUrl = server.url('darkpage.html');
    system.appUrlbar.tap();
    rocketbar.enterText(nextUrl, true);
    system.gotoBrowser(nextUrl);

    // Validate that we have the same number of apps.
    client.switchToFrame();
    assert.equal(nApps, system.getAppWindows().length,
      'did not open a new browser window');
  });
});
