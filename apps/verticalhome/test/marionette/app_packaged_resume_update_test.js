/* global __dirname */
'use strict';

var assert = require('assert');
var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');

var createAppServer = require('./server/parent');
var iconAppState = require('./lib/icon_app_state');
var launchIcon = require('./lib/launch_icon');

marionette('Vertical Home - Packaged App Update', function() {
  var client = marionette.client(Home2.clientOptions);

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
    subject = new Home2(client);
    system = new System(client);
    appInstall = new AppInstall(client);

    // wait for the system app to be running
    system.waitForStartup();
    client.apps.launch(Home2.URL);
    subject.waitForLaunch();

    // install the app
    client.switchToFrame();
    appInstall.installPackage(server.packageManifestURL);

    // switch to the homescreen
    client.switchToFrame(system.getHomescreenIframe());
  });

  teardown(function(done) {
    server.close(done);
  });

  function expectAppState(icon, state) {
    client.waitFor(function() {
      var currentState = iconAppState(icon);
      return currentState === state;
    });
  }

  test('resume update', function() {
    var appIcon = subject.getIcon(server.packageManifestURL);

    // ensure the app is installed before updating it
    client.waitFor(function() {
      return iconAppState(appIcon) === 'ready';
    });

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

    // pause the update
    launchIcon(appIcon);
    subject.confirmDialog('pause');
    expectAppState(appIcon, 'paused');

    // resume the update
    launchIcon(appIcon);
    subject.confirmDialog('resume');
    expectAppState(appIcon, 'loading');

    // Wait for the download to be complete.
    server.uncork('/app.zip');
    client.waitFor(function() {
      return iconAppState(appIcon) === 'ready';
    });

    // verify the app was really updated
    subject.launchAndSwitchToApp(server.packageManifestURL);
    assert.equal(client.title(), 'updatedwow');
  });
});

