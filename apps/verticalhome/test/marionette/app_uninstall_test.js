/* global __dirname */
'use strict';

var assert = require('assert');

var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');

var createAppServer = require('./server/parent');
var getIconId = require('./lib/icon_id');

marionette('Vertical - App Uninstall', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
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
    system.waitForFullyLoaded();

    selectors = home.Selectors;

    client.apps.launch(home.URL);
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
    // helps marionette finding the icon: Bug 1046706
    home.moveIconToIndex(icon, 0);

    var remove = icon.findElement('.remove');

    home.waitForSystemBanner();

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

