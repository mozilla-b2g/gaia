'use strict';

var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');
var Server = require('../../../../shared/test/integration/server');
var assert = require('assert');

marionette('History Header', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
  var home, search, server, rocketbar, system;

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
    home = client.loader.getAppClass('verticalhome');
    search = client.loader.getAppClass('search');
    rocketbar = new Rocketbar(client);
    system = client.loader.getAppClass('system');
    system.waitForStartup();
  });

  test('Displays after visiting a site', function() {
    client.apps.launch(search.URL);
    client.apps.switchToApp(search.URL);

    // The history heading is empty on first launch.
    var historyHeader = client.findElement(search.Selectors.historyHeader);
    assert.ok(!historyHeader.displayed());

    // Navigate to a page now.
    client.switchToFrame();
    var url = server.url('sample.html');
    system.appUrlbar.tap();
    rocketbar.enterText(url + '\uE006');
    system.gotoBrowser(url);

    // After visiting a site we should show the history header.
    system.goHome();
    client.apps.launch(search.URL);
    client.apps.switchToApp(search.URL);
    client.waitFor(function() {
      return client.findElement(search.Selectors.historyHeader).displayed();
    });
  });

});
