'use strict';

var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');
var Settings = require('../../../settings/test/marionette/app/app');

var assert = require('assert');

marionette('Browser test', function() {

  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var search, system, server, home, rocketbar, settingsApp, actions;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    home = client.loader.getAppClass('homescreen');
    search = client.loader.getAppClass('search');
    system = client.loader.getAppClass('system');
    rocketbar = new Rocketbar(client);
    settingsApp = new Settings(client);
    actions = client.loader.getActions();
    system.waitForFullyLoaded();
  });

  test('Clear browsing history', function() {
    // Open then close web page.
    var url = server.url('sample.html');
    rocketbar.goToURL(url);
    client.helper.wait(500);
    system.closeBrowserByUrl(url);

    // Open browser app.
    client.apps.launch(search.URL);
    client.apps.switchToApp(search.URL);

    client.waitFor(function() {
      return search.getHistoryResults().length === 1;
    });

    // Open settings app.
    client.switchToFrame();
    settingsApp.launch();

    // Navigate to the Browsing Privacy menu.
    var browsingPrivacyPanel = settingsApp.browsingPrivacyPanel;
    browsingPrivacyPanel.clickClearHistoryButton();
    browsingPrivacyPanel.clickConfirmDialogSubmit();

    client.apps.close(Settings.ORIGIN);

    // Reopen the browser app.
    client.apps.launch(search.URL);
    client.apps.switchToApp(search.URL);

    assert.equal(search.getHistoryResults().length, 0);
  });
});
