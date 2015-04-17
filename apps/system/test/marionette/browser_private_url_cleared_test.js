'use strict';

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');

marionette('Private Browser - URL Persistence', function() {

  var client = marionette.client({
    prefs: {
      'dom.w3c_touch_events.enabled': 1
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
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  test('Url is cleared after submitting and pressing home in private window',
    function() {
    // Use the home-screen search box to open up the system browser
    var url = server.url('sample.html');
    rocketbar.homescreenFocus();
    search.triggerFirstRun(rocketbar);
    rocketbar.enterText(url + '\uE006');
    system.gotoBrowser(url);

    client.switchToFrame();
    system.appChromeContextLink.tap();
    system.appChromeContextNewPrivate.tap();
    system.gotoBrowser('app://system.gaiamobile.org/private_browser.html');

    client.switchToFrame();
    system.appUrlbar.tap();
    rocketbar.enterText(url + '\uE006');
    system.gotoBrowser(url);

    system.goHome();
    rocketbar.homescreenFocus();
    assert.equal(rocketbar.input.getAttribute('value'), '');
  });
});
