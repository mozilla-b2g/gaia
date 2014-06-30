/* global __dirname */

'use strict';

// var assert = require('assert');

var Home2 = require('./lib/home2');
var Rocketbar = require(
  '../../../../apps/system/test/marionette/lib/rocketbar.js');
var Search = require('../../../../apps/search/test/marionette/lib/search.js');
var System = require('../../../../apps/system/test/marionette/lib/system');
var Browser = require('../../../../apps/browser/test/marionette/lib/browser');
var Server = require('../../../../shared/test/integration/server');

marionette('Vertical - Search Terms: URI scheme', function() {

  var client = marionette.client(Home2.clientOptions);
  var home, rocketbar, search, system, browser, server;

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
    browser = new Browser(client);
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

    // Use a variable to change the search Term in the Rocketbar
    rocketbar.enterText(searchTerms);
    // search.goToResults();
    client.apps.switchToApp(Browser.URL);
  }

  test('Testing URI Scheme - DATA:', function() {
    searchAndVerifyBrowser(
      'data:text/html;base64,PGh0bWw+DQo8c2NyaXB0PndpbmRvdy5hbGV' +
      'ydCgiSGVsbG8gVGhlcmUiKTs8L3NjcmlwdD4NCjwvaHRtbD4=');
      // the data string is <html><script>window.alert("Hello There");
      // </script></html>
  });

});
