'use strict';

var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');

marionette('Private Browser - Window.open', function() {

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      }
    }
  });

  var home, rocketbar, server, system;

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
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
  });

  test('Open windows from private browsers are also private', function() {
    // Use the home-screen search box to open up the system browser
    var url = server.url('sample.html');
    rocketbar.homescreenFocus();
    rocketbar.enterText(url, true);

    client.switchToFrame();
    system.appChromeContextLink.tap();
    system.appChromeContextNewPrivate.tap();
    system.gotoBrowser('app://system.gaiamobile.org/private_browser.html');

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
