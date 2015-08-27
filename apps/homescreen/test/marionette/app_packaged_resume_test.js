/* global __dirname */
'use strict';

var assert = require('assert');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

marionette('Homescreen - Packaged App Resuming Downloads', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });

  var server, actions, home, system, appInstall;
  setup(function(done) {
    var app = __dirname + '/fixtures/template_app';
    createAppServer(app, client, function(err, _server) {
      server = _server;

      actions = client.loader.getActions();
      home = client.loader.getAppClass('homescreen');
      system = client.loader.getAppClass('system');
      appInstall = new AppInstall(client);

      system.waitForFullyLoaded();
      home.waitForLaunch();

      done(err);
    });
  });

  teardown(function(done) {
    server.close(done);
  });

  function tapAndWaitFor(icon, element) {
    client.waitFor(function() {
      icon.tap();
      actions.wait(0.5).perform();
      return element.scriptWith(function(el) {
        return getComputedStyle(el).display !== 'none';
      });
    });
  }

  test('failed state then retry and launch', function() {
    client.switchToFrame();

    server.cork(server.applicationZipUri);
    appInstall.installPackage(server.packageManifestURL);

    client.switchToFrame(system.getHomescreenIframe());

    // Get the icon
    var icon = home.getIcon(server.packageManifestURL);

    // Scroll so the icon is in the middle of the screen and won't be
    // obscured by the system toast
    home.scrollIconToCenter(icon);

    // pause the download
    tapAndWaitFor(icon, home.cancelDownloadDialog);

    home.actionDialog(home.cancelDownloadDialog, 'stop-download-action');
    home.waitForIconImageUrl(icon, 'app_install_canceled');

    // resume the download
    tapAndWaitFor(icon, home.resumeDownloadDialog);
    home.actionDialog(home.resumeDownloadDialog, 'resume-download-action');
    client.waitFor(function() {
      return home.iconIsLoading(icon);
    });

    // pause it again!
    tapAndWaitFor(icon, home.cancelDownloadDialog);
    home.actionDialog(home.cancelDownloadDialog, 'stop-download-action');
    home.waitForIconImageUrl(icon, 'app_install_canceled');

    // uncork so next resume works...
    server.uncork(server.applicationZipUri);

    // finally download the entire app
    tapAndWaitFor(icon, home.resumeDownloadDialog);
    home.actionDialog(home.resumeDownloadDialog, 'resume-download-action');
    home.waitForIconImageUrl(icon, 'app-icon');

    // now it should work!
    home.launchIcon(icon);
    assert.equal(client.title(), 'iwrotethis');
  });
});


