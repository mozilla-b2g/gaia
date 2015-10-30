'use strict';

var assert = require('assert');
var AppInstall = require('./lib/app_install');
var Server = require('../../../../shared/test/integration/server');

marionette('Install addon dialog', function() {

  var client = marionette.client({
    profile: {},
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  var appInstall, server, system;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done(err);
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    appInstall = new AppInstall(client);
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    client.switchToFrame();
  });

  test('Shows warning for addons affecting system app', function() {
    var addonManifestURL = server.url('addon_affecting_system.webapp');

    client.executeScript(function install(url) {
      window.wrappedJSObject.navigator.mozApps.install(url);
    }, [addonManifestURL]);

    client.helper.waitForElement(appInstall.addonWarning);
  });

  test('Skips showing warning for addons not affecting system app', function() {
    var addonManifestURL = server.url('addon_not_affecting_system.webapp');

    client.executeScript(function install(url) {
      window.wrappedJSObject.navigator.mozApps.install(url);
    }, [addonManifestURL]);

    client.helper.waitForElement(appInstall.installDialog);
    assert(!appInstall.addonWarning.displayed(), 'warning is invisible');
  });
});
