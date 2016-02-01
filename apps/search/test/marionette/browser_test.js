'use strict';

var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');

var assert = require('chai').assert;

marionette('Browser test', function() {

  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var search, system, server, home, rocketbar;

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
    system = client.loader.getAppClass('system');
    rocketbar = new Rocketbar(client);
    system.waitForFullyLoaded();
  });

  test('Test title injecting html', function() {
    var url = server.url('xsstitle.html');
    rocketbar.goToURL(url);
    client.helper.wait(1500);
    system.closeBrowserByUrl(url);

    // Open browser app.
    client.apps.launch(search.URL);
    client.apps.switchToApp(search.URL);

    client.waitFor(function() {
      return search.getHistoryResults().length === 1;
    });

    var title = client.executeScript(function() {
      return document.querySelector('#history .title').innerHTML;
    });

    assert.equal(title, '&lt;em&gt;test&lt;/em&gt;');
  });

  test('Large Icon', function() {
    var url = server.url('largeicon.html');
    rocketbar.goToURL(url);
    client.helper.wait(500);
    system.closeBrowserByUrl(url);

    // Open browser app.
    client.apps.launch(search.URL);
    client.apps.switchToApp(search.URL);

    client.waitFor(function() {
      return search.getHistoryResults().length === 1;
    });

    var width = client.executeScript(function() {
      var icon = document.querySelector('#history .icon');
      return icon.clientWidth;
    });

    assert.equal(width, 16);
  });

  test('Ensure fallback to url when no place title', function() {
    var url = server.url('notitle.html');
    rocketbar.goToURL(url);
    client.helper.wait(500);
    system.closeBrowserByUrl(url);

    // Open browser app.
    client.apps.launch(search.URL);
    client.apps.switchToApp(search.URL);

    client.waitFor(function() {
      return search.getTopSites().length === 1;
    });

    var topSite = search.getTopSites()[0];

    assert.equal(topSite.text(), url);
  });
});
