/* global __dirname */
'use strict';

var assert = require('assert');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

marionette('Homescreen - Appcache installed download', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
  var server;
  setup(function(done) {
    var app = __dirname + '/fixtures/appcache';
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

  test('shows spinner while downloading', function() {
    // correctly install the app...
    client.switchToFrame();

    // ensure appcache path is delayed
    server.cork(server.manifest.appcache_path);
    appInstall.install(server.manifestURL);

    // switch back to the homescreen
    client.switchToFrame(system.getHomescreenIframe());

    var icon = home.getIcon(server.manifestURL);

    // wait until we see the nice spinner thing
    client.waitFor(function() {
      return home.iconIsLoading(icon);
    });

    // let the rest of the app come through
    server.uncork(server.manifest.appcache_path);
    // wait until it is no longer loading
    client.waitFor(function() {
      return !home.iconIsLoading(icon);
    });

    // ensure the app launches!
    home.launchIcon(icon);
    assert.equal(client.title(), 'iwrotethis');
  });
});
