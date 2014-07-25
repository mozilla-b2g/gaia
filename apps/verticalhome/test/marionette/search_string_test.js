/* global __dirname */

'use strict';

var Home2 = require('./lib/home2');
var Rocketbar = require(
  '../../../../apps/system/test/marionette/lib/rocketbar.js');
var Search = require('../../../../apps/search/test/marionette/lib/search.js');
var System = require('../../../../apps/system/test/marionette/lib/system');
var Server = require('../../../../shared/test/integration/server');

marionette('Vertical - Search Terms: URI scheme', function() {

  var client = marionette.client(Home2.clientOptions);
  var home, rocketbar, search, system, server;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
    system = new System(client);
  });

  suiteTeardown(function() {
    server.stop();
  });

  setup(function() {
    home = new Home2(client);
    search = new Search(client);
    rocketbar = new Rocketbar(client);
    system = new System(client);
    system.waitForStartup();
    search.removeGeolocationPermission();
  });

  function searchAndVerifyBrowser(searchTerms) {
    var searchUrl = server.url('search.html') + '?q={searchTerms}';
    client.settings.set('search.urlTemplate', searchUrl);

    // Lauch the rocketbar and trigger its first run notice
    home.waitForLaunch();
    home.focusRocketBar();
    search.triggerFirstRun(rocketbar);

    rocketbar.enterText(searchTerms + '\uE006');

    // Ensure the browser is launched
    rocketbar.switchToBrowserFrame(searchTerms);
  }

  test('Testing URI Scheme - DATA:', function() {
    searchAndVerifyBrowser('data:text/html, <html>Hello World</html>');
  });

});
