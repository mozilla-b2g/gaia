'use strict';

/* globals __dirname */

var Home2 = require('../../../verticalhome/test/marionette/lib/home2');
var System = require('../../../system/test/marionette/lib/system');
var Search = require('./lib/search');
var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');
var Server = require('../../../../shared/test/integration/server');
var assert = require('assert');

marionette('Places tests', function() {

  var client = marionette.client(Home2.clientOptions);
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
    home = new Home2(client);
    search = new Search(client);
    rocketbar = new Rocketbar(client);
    system = new System(client);
    system.waitForStartup();
    search.removeGeolocationPermission();
  });

  test('Test url searching', function() {

    var url = server.url('sample.html');
    var url2 = server.url('favicon.html');

    // Lauch the rocketbar and trigger its first run notice
    home.waitForLaunch();
    home.focusRocketBar();
    search.triggerFirstRun(rocketbar);

    // Input a url and press enter to visit
    rocketbar.enterText(url + '\uE006');
    rocketbar.switchToBrowserFrame(url);

    // Go home
    client.switchToFrame();
    home.pressHomeButton();
    client.apps.switchToApp(Home2.URL);

    // Redo search for url
    home.focusRocketBar();
    rocketbar.enterText(url);
    search.goToResults();
    var id = search.getResultSelector(url);
    var app = client.helper.waitForElement(id);

    // Click result and check app loads
    app.click();
    client.switchToFrame();
    rocketbar.switchToBrowserFrame(url);

    // Go home
    client.switchToFrame();
    home.pressHomeButton();
    client.apps.switchToApp(Home2.URL);

    // Input a different url and press enter to visit
    home.focusRocketBar();
    rocketbar.enterText(url2 + '\uE006');
    rocketbar.switchToBrowserFrame(url2);

    // Go home
    client.switchToFrame();
    home.pressHomeButton();
    client.apps.switchToApp(Home2.URL);

    // Redo search for server url
    home.focusRocketBar();
    rocketbar.enterText(server.url(''));

    // Sample page should be shown, but the favicon page should be
    // dedupped
    search.goToResults();
    id = search.getResultSelector(url);
    client.helper.waitForElement(id);
    assert.equal(search.getResult(url2).length, 0);
  });

  test.skip('Search for a string that doesnt match visited url', function() {
    var url = server.url('sample.html');
    search.triggerFirstRun(rocketbar);
    rocketbar.focus();
    rocketbar.enterText(url + '\uE006');
    rocketbar.waitForBrowserFrame();
    client.switchToFrame();
    rocketbar.focus();
    rocketbar.enterText('non_matching_string');
    search.goToResults();
    assert.equal(client.findElements(Search.Selectors.firstPlace).length, 0);
  });

  test.skip('Ensures urls visited twice only show in results once', function() {
    var url = server.url('sample.html');
    search.triggerFirstRun(rocketbar);
    rocketbar.focus();
    rocketbar.enterText(url + '\uE006');
    rocketbar.waitForBrowserFrame();
    rocketbar.focus();
    rocketbar.enterText(url + '\uE006');
    rocketbar.waitForBrowserFrame();
    client.switchToFrame();
    rocketbar.focus();
    rocketbar.enterText(url);
    search.goToResults();

    // Wait to get the correct amount of results
    client.waitFor(function() {
      return client.findElements(Search.Selectors.firstPlace).length === 1;
    }.bind(this));

    // Wait for a second and check we dont get extra results
    client.helper.wait(1000);
    assert.equal(client.findElements(Search.Selectors.firstPlace).length, 1);
  });

  test.skip('Ensure favicon is loaded', function() {
    var url = server.url('favicon.html');
    search.triggerFirstRun(rocketbar);
    rocketbar.focus();
    rocketbar.enterText(url + '\uE006');
    rocketbar.waitForBrowserFrame();

    client.waitFor(function() {
      client.switchToFrame();
      rocketbar.focus();
      rocketbar.enterText(url);
      search.goToResults();
      var result = client.helper.waitForElement('#places div .icon');
      return !result.getAttribute('class').match('empty');
    });
  });

});
