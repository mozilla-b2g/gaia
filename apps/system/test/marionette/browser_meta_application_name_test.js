'use strict';

var assert = require('assert');
var Home = require(
  '../../../../apps/verticalhome/test/marionette/lib/home2');
var Search = require(
  '../../../../apps/search/test/marionette/lib/search');
var Server = require('../../../../shared/test/integration/server');
var System = require('./lib/system');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser - Site loading background', function() {

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

    // Need to wait for the homescreen to be ready as this test takes a
    // screenshot. Without the homescreen, we may take a screenshot of the
    // system boot screen.
    client.apps.launch(Home.URL);
    home.waitForLaunch();
    client.switchToFrame();

    search.removeGeolocationPermission();
  });

  test('application-name meta tag changes rocketbar value', function() {
    var expected = 'gaia rocks';
    var url = server.url('meta_application_name.html');

    // Use the home-screen search box to open up the system browser
    rocketbar.homescreenFocus();
    rocketbar.enterText(url + '\uE006');

    system.gotoBrowser(url);
    client.switchToFrame();
    assert.ok(system.appUrlbar.text().indexOf(expected) !== -1);
  });
});
