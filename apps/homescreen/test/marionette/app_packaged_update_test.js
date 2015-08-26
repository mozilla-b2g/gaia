/* global __dirname */
'use strict';

var assert = require('assert');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

marionette('Homescreen - Packaged App Update', function() {
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

    // Launch the homescreen first, then go to the system app.
    // Make sure we do this before installing an application.
    home.waitForLaunch();
    client.switchToFrame();

    // install the app with a broken icon
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

    // Prepare to screenshot
    var iconImage = home.getIconImage(icon);
    var iconTitle = home.getIconText(icon);

    // Cork the zip so we can see the loading spinner.
    server.cork('/app.zip');

    // Update the manifests.
    server.setRoot(__dirname + '/fixtures/template_app_updated');

    // Ensure we have an update.
    appInstall.update(server.packageManifestURL);

    // Ensure we see the loading signs...
    client.waitFor(function() {
      return home.iconIsLoading(icon);
    });

    // Wait for the download to be complete.
    server.uncork('/app.zip');
    home.waitForIconImageUrl(icon, 'app-icon');

    // See bug 826555 for rationale for the title not changing.
    assert.equal(
      home.getIconText(icon),
      iconTitle,
      'app name should not be updated'
    );

    // Make sure the icon changed
    assert.notEqual(
      home.getIconImage(icon),
      iconImage,
      'app icon should have updated');

    // verify the app was really updated
    home.launchIcon(icon);
    assert.equal(client.title(), 'updatedwow');
  });
});
