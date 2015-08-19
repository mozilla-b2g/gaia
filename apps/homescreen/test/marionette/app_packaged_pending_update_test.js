/* global __dirname */
'use strict';

var assert = require('assert');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

marionette('Homescreen - Packaged App Pending Update', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options.js'),
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  var server;
  setup(function(done) {
    var app = __dirname + '/fixtures/template_app';
    createAppServer(app, client, function(err, _server) {
      server = _server;
      done(err);
    });
  });

  var home, system, appInstall;
  setup(function() {
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    appInstall = new AppInstall(client);

    // wait for the system app to be running
    system.waitForFullyLoaded();
    client.apps.launch(home.URL);
    home.waitForLaunch();

    // install the app
    client.switchToFrame();
    appInstall.installPackage(server.packageManifestURL);

    // switch to the homescreen
    client.switchToFrame(system.getHomescreenIframe());
  });

  teardown(function(done) {
    server.close(done);
  });

  test('update an installed app', function() {
    var icon = home.getIcon(server.packageManifestURL);

    // ensure the app is installed before updating it
    home.waitForIconImageUrl(icon, 'app-icon');

    // Update the manifests.
    server.setRoot(__dirname + '/fixtures/template_app_updated');

    // Stage the update
    appInstall.stageUpdate(server.packageManifestURL);

    // ensure we can still launch an app in the older version
    home.launchIcon(icon);
    assert.equal(client.title(), 'iwrotethis');
  });
});

