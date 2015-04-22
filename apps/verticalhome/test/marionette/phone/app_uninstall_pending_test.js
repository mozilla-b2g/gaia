/* global __dirname */
'use strict';

var assert = require('assert');

var AppInstall =
  require('../../../../../apps/system/test/marionette/lib/app_install');

var createAppServer = require('../server/parent');
var getIconId = require('../lib/icon_id');

marionette('Vertical - App uninstall while pending', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
  var actions, home, system, appInstall;
  var selectors;

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
    home = client.loader.getAppClass('verticalhome');
    system = client.loader.getAppClass('system');
    selectors = home.Selectors;

    // ensure that the zip file does not get sent
    server.cork(server.applicationZipUri);

    // wait for the system app to be running
    system.waitForStartup();
    client.apps.launch(home.URL);
    home.waitForLaunch();

    // install the app
    client.switchToFrame();
    appInstall.installPackage(server.packageManifestURL);

    // switch to the homescreen
    client.switchToFrame(system.getHomescreenIframe());

    // this helps marionette finding the icon: Bug 1046706
    var icon = home.getIcon(server.packageManifestURL);
    home.moveIconToIndex(icon, 0);

    home.enterEditMode();
  });

  test('use edit mode to uninstall the app', function() {
    var icon = home.getIcon(server.packageManifestURL);
    var iconId = getIconId(icon);
    var remove = icon.findElement('.remove');

    // XXX: work around issues where the icon is hidden by other
    //      status messages on the system app.
    icon.scriptWith(function(el) {
      // effectively scroll to the bottom of the screen.
      el.scrollIntoView(false);
    });

    // remove the icon
    remove.tap();
    // confirm the dialog to ensure it was removed.
    client.switchToFrame();
    home.confirmDialog('remove');
    // ensure the icon disappears
    client.switchToFrame(system.getHomescreenIframe());
    client.helper.waitForElementToDisappear(icon);

    home.restart();

    var allIconIds = home.getIconIdentifiers();
    assert.ok(allIconIds.indexOf(iconId) === -1, 'app was removed');
  });

});


