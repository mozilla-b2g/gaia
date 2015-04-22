/* global __dirname */
'use strict';

var assert = require('assert');
var AppInstall =
  require('../../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('../server/parent');

var iconAppState = require('../lib/icon_app_state');

marionette('Vertical Home - Hosted app failed icon fetch', function() {
  var client = marionette.client(require(__dirname + '/client_options.js'));
  var server;
  setup(function(done) {
    var app = __dirname + '/fixtures/appcache';
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

    system.waitForStartup();
    subject.waitForLaunch();
  });

  teardown(function(done) {
    server.close(done);
  });

  test('shows spinner while downloading', function() {
    // correctly install the app...
    client.switchToFrame();

    // ensure appcache path is delayed
    server.cork(server.manifest.appcache_path);
    appInstall.install(server.manifestURL);

    // switch back to the homescreen
    client.switchToFrame();
    client.switchToFrame(system.getHomescreenIframe());

    var icon = subject.getIcon(server.manifestURL);

    // wait until we see the nice spinner thing
    client.waitFor(function() {
      return iconAppState(icon) === 'loading';
    });

    // let the rest of the app come through
    server.uncork(server.manifest.appcache_path);
    // wait until it is no longer loading
    client.waitFor(function() {
      return iconAppState(icon) !== 'loading';
    });

    // ensure the app launches!
    subject.launchAndSwitchToApp(server.manifestURL);
    assert.equal(client.title(), 'iwrotethis');
  });
});
