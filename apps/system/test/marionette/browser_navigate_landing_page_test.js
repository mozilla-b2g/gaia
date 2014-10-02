'use strict';

var assert = require('assert');
var Home = require(
  '../../../../apps/verticalhome/test/marionette/lib/home2');
var Search = require(
  '../../../../apps/search/test/marionette/lib/search');
var Server = require('../../../../shared/test/integration/server');
var System = require('./lib/system');
var Rocketbar = require('./lib/rocketbar');

marionette('Browser - Navigating from the landing page',
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

  test('navigates the landing page in place', function() {
    // Open the landing page
    client.apps.launch(Search.URL);
    client.apps.switchToApp(Search.URL);
    client.helper.waitForElement('body');
    client.switchToFrame();
    system.appUrlbar.click();

    var nApps = system.getAppWindows().length;
    var nBrowsers = system.getBrowserWindows().length;
    var url = server.url('sample.html');
    rocketbar.enterText(url + '\uE006');

    // Opens the search window, so we should have 3 with the home screen.
    assert.equal((nApps + 1), system.getAppWindows().length,
      'expected number of app windows');

    // Navigates the landing page which used to be an app window.
    assert.equal((nBrowsers + 1), system.getBrowserWindows().length,
      'expected number of browsers');

    // Verify visual components are reset
    var sel = System.Selector;
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
