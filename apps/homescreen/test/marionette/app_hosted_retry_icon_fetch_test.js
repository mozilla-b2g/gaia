/* global __dirname */
'use strict';

var assert = require('assert');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

marionette('Homescreen - Hosted app failed icon fetch', function() {
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

    system.waitForFullyLoaded();
    home.waitForLaunch();
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

  test('shows icon after a restart', function() {
    // go to the system app
    client.switchToFrame();

    // don't let the server send the zip archive
    server.cork(server.applicationZipUri);
    appInstall.installPackage(server.packageManifestURL);

    // switch back to the homescreen
    client.switchToFrame(system.getHomescreenIframe());

    var icon = home.getIcon(server.packageManifestURL);
    client.waitFor(function() {
      return home.iconIsLoading(icon);
    });

    // stop the download
    tapAndWaitFor(icon, home.cancelDownloadDialog);
    home.actionDialog(home.cancelDownloadDialog, 'stop-download-action');
    home.waitForIconImageUrl(icon, 'app_install_canceled');

    // Restart the download
    server.uncork(server.applicationZipUri);

    // resume the download from the ui
    tapAndWaitFor(icon, home.resumeDownloadDialog);
    home.actionDialog(home.resumeDownloadDialog, 'resume-download-action');

    // wait until we are showing our desired icon
    home.waitForIconImageUrl(icon, 'app-icon');
  });

  test('fallback to default icon when icon fails', function() {
    var iconURL = server.manifest.icons['128'];
    // correctly install the app...
    client.switchToFrame();

    // ensure the icon fails to download!
    server.fail(iconURL);
    appInstall.install(server.manifestURL);

    // switch back to the homescreen
    client.switchToFrame(system.getHomescreenIframe());

    var icon = home.getIcon(server.manifestURL);

    // ensure the default icon is shown
    home.waitForIconImageUrl(icon, 'default');

    server.unfail(iconURL);

    // XXX: We don't have real network access but we can sorta emulate it by
    //      failing then switching back to an online state.
    client.executeScript(function() {
      window.dispatchEvent(new CustomEvent('online'));
    });

    // wait until we are showing our desired icon
    home.waitForIconImageUrl(icon, 'app-icon');

    // ensure the icon can be launched!
    home.launchIcon(icon);
    assert.equal(client.title(), 'iwrotethis');
  });
});

