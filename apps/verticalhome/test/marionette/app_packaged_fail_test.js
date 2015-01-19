/* global __dirname */
'use strict';

var assert = require('assert');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

var iconAppState = require('./lib/icon_app_state');
var launchIcon = require('./lib/launch_icon');

marionette('Vertical Home - Packaged App Failed Download', function() {
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

    system.waitForFullyLoaded();
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

    server.fail(server.applicationZipUri);
    appInstall.installPackage(server.packageManifestURL);

    client.switchToFrame(system.getHomescreenIframe());

    var icon = subject.getIcon(server.packageManifestURL);
    expectAppState(icon, 'error');

    server.unfail(server.applicationZipUri);

    // helps marionette finding the icon: Bug 1046706
    subject.moveIconToIndex(icon, 0);

    launchIcon(icon);
    subject.confirmDialog('resume');
    expectAppState(icon, 'ready');

    subject.launchAndSwitchToApp(server.packageManifestURL);
    assert.equal(client.title(), 'iwrotethis');
  });
});

