/* global __dirname */
'use strict';

var assert = require('assert');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var iconAppState = require('./lib/icon_app_state');
var createAppServer = require('./server/parent');

marionette('Vertical Home - Packaged App Install', function() {
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

  test('install app', function() {
    client.switchToFrame();
    appInstall.installPackage(server.packageManifestURL);

    client.switchToFrame(system.getHomescreenIframe());

    var appIcon = subject.getIcon(server.packageManifestURL);
    // ensure the app is ready
    client.waitFor(function() {
      return iconAppState(appIcon) === 'ready';
    });

    subject.launchAndSwitchToApp(server.packageManifestURL);
    assert.equal(client.title(), 'iwrotethis');
  });
});
