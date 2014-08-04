/* global __dirname */
'use strict';

var assert = require('assert');
var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

var iconAppState = require('./lib/icon_app_state');
var launchIcon = require('./lib/launch_icon');

marionette('Vertical Home - Packaged App Resuming Downloads', function() {
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

    system.waitForStartup();
    subject.waitForLaunch();
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

  test('failed state then retry and launch', function() {
    client.switchToFrame();

    appInstall.installPackage(server.packageManifestURL);
    server.cork(server.applicationZipUri);

    client.switchToFrame(system.getHomescreenIframe());

    // pause the download
    var icon = subject.getIcon(server.packageManifestURL);
    launchIcon(icon);
    subject.confirmDialog('pause');
    expectAppState(icon, 'paused');

    // resume the download
    launchIcon(icon);
    subject.confirmDialog('resume');
    expectAppState(icon, 'loading');

    // pause it again!
    launchIcon(icon);
    subject.confirmDialog('pause');
    expectAppState(icon, 'paused');

    // uncork so next resume works...
    server.uncork(server.applicationZipUri);

    // finally download the entire app
    launchIcon(icon);
    subject.confirmDialog('resume');
    expectAppState(icon, 'ready');

    // now it should work!
    subject.launchAndSwitchToApp(server.packageManifestURL);
    assert.equal(client.title(), 'iwrotethis');
  });
});


