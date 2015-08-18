/* global __dirname */
'use strict';

var assert = require('assert');

var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

marionette('Homescreen - App uninstall while pending', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
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

    // ensure that the zip file does not get sent
    server.cork(server.applicationZipUri);

    // wait for the system app to be running
    system.waitForFullyLoaded();
    client.apps.launch(home.URL);
    home.waitForLaunch();

    // install the app
    client.switchToFrame();
    appInstall.installPackage(server.packageManifestURL);

    // switch to the homescreen
    client.switchToFrame(system.getHomescreenIframe());
  });

  test('uninstall the app', function() {
    var icon = home.getIcon(server.packageManifestURL);

    // XXX: work around issues where the icon is hidden by other
    //      status messages on the system app.
    icon.scriptWith(function(el) {
      // effectively scroll to the bottom of the screen.
      el.scrollIntoView(false);
    });

    // remove the icon
    actions.press(icon).wait(0.5).perform();
    actions.move(home.uninstallTray).release().perform();

    // confirm the dialog to ensure it was removed.
    client.switchToFrame();
    home.confirmDialog('remove');

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

