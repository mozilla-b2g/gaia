/* global __dirname */
'use strict';

var assert = require('assert');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');

var createAppServer = require('./server/parent');
var iconAppState = require('./lib/icon_app_state');

marionette('Vertical Home - Packaged App Update', function() {
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

  var subject;
  var system;
  var appInstall;
  setup(function() {
    subject = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    appInstall = new AppInstall(client);

    // wait for the system app to be running
    system.waitForFullyLoaded();
    client.apps.launch(subject.URL);
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

  test('update an installed app', function() {
    var appIcon = subject.getIcon(server.packageManifestURL);

    // ensure the app is installed before updating it
    client.waitFor(function() {
      return iconAppState(appIcon) === 'ready';
    });

    // Update the manifests.
    server.setRoot(__dirname + '/fixtures/template_app_updated');

    // Stage the update
    appInstall.stageUpdate(server.packageManifestURL);

    // ensure we can still launch an app in the older version
    subject.launchAndSwitchToApp(server.packageManifestURL);
    assert.equal(client.title(), 'iwrotethis');
  });
});

