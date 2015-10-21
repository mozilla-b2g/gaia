/* global __dirname */
'use strict';

var assert = require('assert');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

marionette('Homescreen - App unrecoverable error', function() {
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

  test('remove an app that was in an unrecoverable state', function() {
    client.switchToFrame();

    server.serverError(server.applicationZipUri);
    appInstall.installPackage(server.packageManifestURL);

    client.switchToFrame(system.getHomescreenIframe());

    // if the server returns a 500 error the app is assumed to be in an
    // unrecoverable state.
    var icon = home.getIcon(server.packageManifestURL);
    home.waitForIconImageUrl(icon, 'unrecoverable');

    // agree to uninstall the app
    icon.tap();
    client.switchToFrame();
    home.confirmDialog('unrecoverable');

    // ensure the icon disappears
    client.switchToFrame(system.getHomescreenIframe());
    client.helper.waitForElementToDisappear(icon);

    // make sure app has gone after restart
    home.restart();
    client.setSearchTimeout(20);
    icon = null;
    try {
      icon = home.getIcon(server.packageManifestURL);
    } catch(e) { }
    assert.ok(!icon, 'app was not removed');
  });
});
