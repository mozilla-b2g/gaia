/* global __dirname */

'use strict';

var Rocketbar = require(
  '../../../../../apps/system/test/marionette/lib/rocketbar.js');
var Server = require('../../../../../shared/test/integration/server');

marionette('Vertical - Search Terms: URI scheme', function() {

  var client = marionette.client(require(__dirname + '/client_options.js'));
  var home, rocketbar, search, system, server;

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
