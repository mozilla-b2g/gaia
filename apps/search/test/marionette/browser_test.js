'use strict';

/* global __dirname */

var Search = require('./lib/search');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');

var assert = require('chai').assert;

marionette('Browser test', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
  var search, system, server, home, rocketbar;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    search = new Search(client);
    rocketbar = new Rocketbar(client);
    system = client.loader.getAppClass('system');
    system.waitForStartup();
    search.removeGeolocationPermission();
  });

  test('Ensure preloaded sites exist', function() {
    client.apps.launch(Search.URL);
    client.apps.switchToApp(Search.URL);

    client.waitFor(function() {
      return search.getTopSites().length == 2;
    });
  });

  test.skip('Ensure fallback to url when no place title', function() {

    var url = server.url('notitle.html');

    home.waitForLaunch();
    home.focusRocketBar();
    search.triggerFirstRun(rocketbar);

    // Input a url and press enter to visit
    rocketbar.enterText(url + '\uE006');
    rocketbar.switchToBrowserFrame(url);

    client.switchToFrame();
    home.pressHomeButton();

    client.apps.launch(Search.URL);
    client.apps.switchToApp(Search.URL);

    client.waitFor(function() {
      return search.getTopSites().length == 3;
    });

    var topSite = search.getTopSites()[0];
    assert.equal(topSite.text(), url);
  });
});
