'use strict';
var Server = require('../../../../shared/test/integration/server');
var AppInstall = require('./lib/app_install');
var assert = require('assert');

marionette('IME installation', function() {
  var client = marionette.client();

  var system;
  var server;
  var appInstall;

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
    appInstall = new AppInstall(client);
    system = client.loader.getAppClass('system');
    system.waitForStartup();
  });

  test('Test app installation screen', function() {
    var manifestURL = server.url('ime_manifest.webapp');
    appInstall.install(manifestURL);

    // Check app setup dialog
    appInstall.waitForDialog(appInstall.setupDialog);

    // XXX: Hack to cheat the system to trigger the UI for 3rd-party IME
    // installation.
    // The system would only allow installing a privileged IME app, however
    // with a fake server, we can only install a normal webapp. So we hack
    // the system app logic to make it think it is installing a privileged one.
    client.executeScript(function install() {
      var appQueue = window.wrappedJSObject.AppInstallManager.setupQueue;
      if (appQueue) {
        appQueue[0].manifest.type = 'privileged';
      }
    });

    // Setup the new keyboard app to enable the LOL keyboard layout.
    appInstall.setupButton.click();
    appInstall.waitForDialog(appInstall.imeDialog);
    appInstall.imeLayoutOption.click();
    appInstall.imeConfirmButton.click();

    // Check settings value
    var enableLayouts = client.settings.get('keyboard.enabled-layouts');
    assert.ok(enableLayouts[manifestURL].lol);
  });
});
