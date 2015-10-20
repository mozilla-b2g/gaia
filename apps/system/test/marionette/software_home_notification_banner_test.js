'use strict';

var AppInstall = require('./lib/app_install');
var createAppServer = require(
  '../../../homescreen/test/marionette/server/parent');

marionette('Software Home Button - Notification Banner Test', function() {

  var client = marionette.client({
    profile: {
      prefs: {
        'focusmanager.testmode': true
      },
      settings: {
        'software-button.enabled': true
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });
  var appInstall, home, server, system;

  suiteSetup(function(done) {
    // Any app that we can test the download success banner.
    var app = __dirname + '/../apps/fullscreen-app';
    createAppServer(app, client, function(err, _server) {
      server = _server;
      done(err);
    });
  });

  suiteTeardown(function(done) {
    server.close(done);
  });

  setup(function() {
    appInstall = new AppInstall(client);
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
    client.switchToFrame();
  });

  test('Proper layout for system banner and SHB', function() {
    appInstall.installPackage(server.packageManifestURL);

    function rect(el) {
      return el.getBoundingClientRect();
    }

    client.waitFor(function() {
      var shbRect = system.softwareButtons.scriptWith(rect);
      var bannerRect = system.systemBanner.scriptWith(rect);

      return bannerRect.bottom === shbRect.top;
    });
  });
});
