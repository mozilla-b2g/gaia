'use strict';

var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');

marionette('Private Browser - Window.open', function() {

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: false }
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
    home = client.loader.getAppClass('homescreen');
    rocketbar = new Rocketbar(client);
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  test('Open windows from private browsers are also private', function() {
    // Use the home-screen search box to open up the system browser
    var url = server.url('sample.html');
    rocketbar.homescreenFocus();
    rocketbar.enterText(url, true);

    client.switchToFrame();
    system.appChromeContextLink.tap();
    system.appChromeContextNewPrivate.tap();
    system.gotoBrowser(search.privateBrowserUrl);

    client.switchToFrame();
    system.appUrlbar.tap();

    var opener = server.url('windowopen.html');
    rocketbar.enterText(opener, true);
    system.gotoBrowser(opener);
    client.findElement('#trigger1').click();
    client.switchToFrame();

    var browsers;
    client.waitFor(function() {
      browsers = client.findElements(
        '.appWindow.private iframe[data-url*="http://localhost"]');
      return browsers.length === 2;
    });
  });
});
