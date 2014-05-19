'use strict';
/* global __dirname */

var System = require('../../../system/test/marionette/lib/system');
var Server = require('../../../../shared/test/integration/server');
var AppInstall = require('../../../system/test/marionette/lib/app_install');
var assert = require('assert');

marionette('IME installation', function() {
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });

  var system;
  var server;
  var appInstall;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });

    system = new System(client);
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    appInstall = new AppInstall(client);
    system.waitForStartup();
  });

  test('Test app installation screen', function() {
    var url = server.url('ime_manifest.webapp');

    client.executeScript(function install(url) {
      window.wrappedJSObject.navigator.mozApps.install(url);
    }, [url]);

    // Click install button on the app install dialog
    appInstall.waitForDialog(appInstall.installDialog);
    appInstall.installButton.click();

    // Check app setup dialog
    appInstall.waitForDialog(appInstall.setupDialog);

    // Hack to replace the type to privileged.
    client.executeScript(function install() {
      var appQueue = window.wrappedJSObject.AppInstallManager.setupQueue;
      if (appQueue) {
        appQueue[0].manifest.type = 'privileged';
      }
    });

    appInstall.setupButton.click();

    // Check ime layout selection dialog
    appInstall.waitForDialog(appInstall.imeDialog);

    // Check the first option
    appInstall.imeLayoutOption.click();

    // Click the confirm button
    appInstall.imeConfirmButton.click();

    // Check settings value
    var enableLayouts = client.settings.get('keyboard.enabled-layouts');
    assert.ok(url in enableLayouts);
    assert.ok('lol' in enableLayouts[url]);
  });
});
