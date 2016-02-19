/* global __dirname */
'use strict';

var assert = require('assert');

var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

marionette('Homescreen - App Uninstall', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js'),
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var actions, home, system, appInstall;

  var server;
  setup(function(done) {
    var app = __dirname + '/fixtures/template_app';
    createAppServer(app, client, function(err, _server) {
      server = _server;
      done(err);
    });
  });

  setup(function() {
    appInstall = new AppInstall(client);

    actions = client.loader.getActions();
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();

    client.apps.launch(home.URL);
    home.waitForLaunch();
  });

  function test_app_uninstall(manifestURL) {
    // Install the app
    client.switchToFrame();
    appInstall.install(manifestURL);
    appInstall.dismissToast();
    client.switchToFrame(system.getHomescreenIframe());

    var icon = home.getIcon(manifestURL);

    // XXX: work around issues where the icon is hidden by other
    //      status messages on the system app.
    icon.scriptWith(function(el) {
      // effectively scroll to the bottom of the screen.
      el.scrollIntoView(false);
    });

    // remove the icon
    actions.longPress(icon, 1).perform();
    home.removeButton.tap();

    // confirm the dialog to ensure it was removed.
    client.switchToFrame();
    home.confirmDialog('remove');

    // ensure the icon disappears
    client.switchToFrame(system.getHomescreenIframe());
    client.helper.waitForElementToDisappear(icon);

    // make sure app has gone after restart
    home.restart();
    icon = null;
    try {
      icon = home.getIcon(server.packageManifestURL);
    } catch(e) { }
    assert.ok(!icon, 'app was not removed');
  }

  test('uninstall hosted app', function() {
    test_app_uninstall(server.manifestURL);
  });

  test('uninstall packaged app', function() {
    test_app_uninstall(server.packageManifestURL);
  });
});

