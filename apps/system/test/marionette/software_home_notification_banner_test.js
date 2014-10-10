'use strict';

var AppInstall = require('./lib/app_install');
var Home = require(
  '../../../verticalhome/test/marionette/lib/home2');
var createAppServer = require(
  '../../../verticalhome/test/marionette/server/parent');
var System = require('./lib/system');

marionette('Software Home Button - Notification Banner Test', function() {

  var client = marionette.client({
    prefs: {
      'focusmanager.testmode': true,
      'dom.w3c_touch_events.enabled': 1
    },
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false,
      'software-button.enabled': true
    }
  });
  var appInstall, home, server, system;

  suiteSetup(function(done) {
    // Any app that we can test the download success banner.
    var app = __dirname + '/fullscreen-app';
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
    home = new Home(client);
    system = new System(client);
    system.waitForStartup();
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
