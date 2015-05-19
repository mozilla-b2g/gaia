/* global __dirname */
'use strict';

var assert = require('assert');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');

var createAppServer = require('./server/parent');
var iconAppState = require('./lib/icon_app_state');
var iconSrc = require('./lib/icon_src');

marionette('Vertical Home - Packaged App Update', function() {
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

  var subject;
  var system;
  var appInstall;
  setup(function() {
    subject = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    appInstall = new AppInstall(client);

    // wait for the system app to be running
    system.waitForStartup();

    // Launch the homescreen first, then go to the system app.
    // Make sure we do this before installing an application.
    subject.waitForLaunch();
    client.switchToFrame();

    // install the app
    appInstall.installPackage(server.packageManifestURL);

    // switch to the homescreen
    client.switchToFrame(system.getHomescreenIframe());
  });

  teardown(function(done) {
    server.close(done);
  });

  test('update an installed app', function() {
    var appIcon = subject.getIcon(server.packageManifestURL);

    // ensure the app is installed before updating it
    client.waitFor(function() {
      return iconAppState(appIcon) === 'ready';
    });

    var iconTitle = appIcon.findElement('.title').text();

    // Cork the zip so we can see the loading spinner.
    server.cork('/app.zip');

    // Update the manifests.
    server.setRoot(__dirname + '/fixtures/template_app_updated');

    // Ensure we have an update.
    appInstall.update(server.packageManifestURL);

    // Ensure we see the loading signs...
    client.waitFor(function() {
      return iconAppState(appIcon) === 'loading';
    });

    // Wait for the download to be complete.
    server.uncork('/app.zip');
    client.waitFor(function() {
      return iconAppState(appIcon) === 'ready';
    });

    // See bug 826555 for rationale for the title not changing.
    assert.equal(
      appIcon.findElement('.title').text(),
      iconTitle,
      'app name should not be updated'
    );

    // Ensure the icon is updated
    client.waitFor(function() {
      var src = iconSrc(appIcon);
      return src.indexOf(server.manifest.icons[128]) !== -1;
    });

    // verify the app was really updated
    subject.launchAndSwitchToApp(server.packageManifestURL);
    assert.equal(client.title(), 'updatedwow');
  });
});
