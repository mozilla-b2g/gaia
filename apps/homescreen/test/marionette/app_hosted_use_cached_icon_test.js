/* global __dirname */
'use strict';

var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

marionette('Homescreen - Hosted app cached icon fetch', function() {
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

  test('fallback to default icon', function() {
    var iconURL = server.manifest.icons['128'];

    // correctly install the app...
    client.switchToFrame();
    appInstall.install(server.manifestURL);

    // switch back to the homescreen
    client.switchToFrame(system.getHomescreenIframe());
    var icon = home.getIcon(server.manifestURL);

    // ensure it is cached
    client.waitFor(function() {
      return home.getIconImageUrl(icon) === 'app-icon';
    });

    // ensure http fails so we use the cached icon
    server.fail(iconURL);

    // Reload the homescreen
    home.restart();
    icon = home.getIcon(server.manifestURL);

    // check for the cached icon...
    client.waitFor(function() {
      return home.getIconImageUrl(icon) === 'user-set';
    });

    // allow the request to succeed
    server.unfail(iconURL);

    // trigger the download of a new icon
    client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('online'));
    });

    // now shows the freshly redownloaded icon
    client.waitFor(function() {
      return home.getIconImageUrl(icon) === 'app-icon';
    });
  });

});
