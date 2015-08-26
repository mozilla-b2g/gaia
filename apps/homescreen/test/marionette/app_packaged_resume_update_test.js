/* global __dirname */
'use strict';

var assert = require('assert');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

marionette('Homescreen - Packaged App Resume Update', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
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

  function tapAndWaitFor(icon, element) {
    client.scope({ searchTimeout: 100 }).waitFor(function() {
      icon.tap();
      return element.scriptWith(function(el) {
        return getComputedStyle(el).display !== 'none';
      });
    });
  }

  test('resume update', function() {
    var icon = home.getIcon(server.packageManifestURL);

    // ensure the app is installed before updating it
    home.waitForIconImageUrl(icon, 'app-icon');

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

    // pause the update
    tapAndWaitFor(icon, home.cancelDownloadDialog);
    home.actionDialog(home.cancelDownloadDialog, 'stop-download-action');
    home.waitForIconImageUrl(icon, 'app_install_canceled');

    // resume the update
    tapAndWaitFor(icon, home.resumeDownloadDialog);
    home.actionDialog(home.resumeDownloadDialog, 'resume-download-action');
    client.waitFor(function() {
      return home.iconIsLoading(icon);
    });

    // Wait for the download to be complete.
    server.uncork('/app.zip');
    home.waitForIconImageUrl(icon, 'app-icon');

    // verify the app was really updated
    home.launchIcon(icon);
    assert.equal(client.title(), 'updatedwow');
  });
});

