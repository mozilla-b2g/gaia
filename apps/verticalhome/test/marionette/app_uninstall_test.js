/* global __dirname */
'use strict';

var assert = require('assert');
var Actions = require('marionette-client').Actions;

var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');

var createAppServer = require('./server/parent');
var getIconId = require('./lib/icon_id');

marionette('Vertical - App Uninstall', function() {

  var client = marionette.client(Home2.clientOptions);
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
    selectors = Home2.Selectors;
    appInstall = new AppInstall(client);

    actions = new Actions(client);
    home = new Home2(client);
    system = new System(client);
    system.waitForStartup();

    client.apps.launch(Home2.URL);
    home.waitForLaunch();

    // install an app
    client.switchToFrame();
    appInstall.install(server.manifestURL);

    client.switchToFrame(system.getHomescreenIframe());
    home.enterEditMode();
  });

  test('use edit mode to uninstall the app', function() {
    var icon = home.getIcon(server.manifestURL);
    var iconId = getIconId(icon);
    var remove = icon.findElement('.remove');

    // XXX: work around issues where the icon is hidden by other
    //      status messages on the system app.
    icon.scriptWith(function(el) {
      // effectively scroll to the bottom of the screen.
      el.scrollIntoView(false);
    });

    // remove the icon
    remove.click();
    // confirm the dialog to ensure it was removed.
    home.confirmDialog('remove');
    // ensure the icon disappears
    client.helper.waitForElementToDisappear(icon);

    home.restart();

    var allIconIds = home.getIconIdentifiers();
    assert.ok(allIconIds.indexOf(iconId) === -1, 'app was removed');
  });

});

