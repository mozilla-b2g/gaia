'use strict';

var assert = require('assert');
var Home = require(
  '../../../../apps/verticalhome/test/marionette/lib/home2');
var Search = require(
  '../../../../apps/search/test/marionette/lib/search');
var Server = require('../../../../shared/test/integration/server');
var System = require('./lib/system');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser - Launch the same origin after navigating away',
  function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

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
    home = new Home(client);
    rocketbar = new Rocketbar(client);
    search = new Search(client);
    system = new System(client);
    system.waitForStartup();

    search.removeGeolocationPermission();
  });

  test('opens a new sheet with window.open()', function() {
    var url = server.url('windowopen.html');

    // Open the first URL in a sheet.
    rocketbar.homescreenFocus();
    rocketbar.enterText(url + '\uE006');

    // Switch to the app, and navigate to a different url.
    system.gotoBrowser(url);

    client.switchToFrame();
    var browsers = client.findElements( 'iframe[src*="http://localhost"]');
    assert.equal(browsers.length, 1);

    system.gotoBrowser(url);
    client.findElement('#trigger1').click();

    // Validate that a new sheet opens.
    client.switchToFrame();

    client.waitFor(function() {
      browsers = client.findElements('iframe[src*="http://localhost"]');
      return browsers.length === 2;
    });
  });
});
