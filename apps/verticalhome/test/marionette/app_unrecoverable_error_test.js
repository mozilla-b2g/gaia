/* global __dirname */
'use strict';

var assert = require('assert');
var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');
var AppInstall =
  require('../../../../apps/system/test/marionette/lib/app_install');
var createAppServer = require('./server/parent');

var iconAppState = require('./lib/icon_app_state');
var launchIcon = require('./lib/launch_icon');
var getIconId = require('./lib/icon_id');

marionette('Vertical Home - App unrecoverable error', function() {
  var client = marionette.client(Home2.clientOptions);
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
    subject = new Home2(client);
    system = new System(client);
    appInstall = new AppInstall(client);

    system.waitForStartup();
    subject.waitForLaunch();
  });

  teardown(function(done) {
    server.close(done);
  });

  function expectAppState(icon, state) {
    client.waitFor(function() {
      var currentState = iconAppState(icon);
      return currentState === state;
    });
  }

  test('remove an app that was in an unrecoverable state', function() {
    client.switchToFrame();

    server.serverError(server.applicationZipUri);
    appInstall.installPackage(server.packageManifestURL);

    client.switchToFrame(system.getHomescreenIframe());

    // if the server returns a 500 error the app is assumed to be in an
    // unrecoverable state.
    var icon = subject.getIcon(server.packageManifestURL);
    var iconId = getIconId(icon);
    expectAppState(icon, 'unrecoverable');

    // helps marionette finding the icon: Bug 1046706
    subject.moveIconToIndex(icon, 0);

    // agree to uninstall the app
    launchIcon(icon);
    client.switchToFrame();
    subject.confirmDialog('unrecoverable');

    // ensure the icon disappears
    client.switchToFrame(system.getHomescreenIframe());
    client.helper.waitForElementToDisappear(icon);
    // verify that the app was uninstalled
    subject.restart();

    var allIconIds = subject.getIconIdentifiers();
    assert.ok(allIconIds.indexOf(iconId) === -1, 'app was removed');
  });
});
