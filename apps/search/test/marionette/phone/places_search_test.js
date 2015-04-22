'use strict';

var Rocketbar = require('../../../../system/test/marionette/lib/rocketbar.js');
var Server = require('../../../../../shared/test/integration/server');
var assert = require('assert');

marionette('Places tests', function() {

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
    client.apps.switchToApp(home.URL);

    // Redo search for url
    home.focusRocketBar();
    rocketbar.enterText(url);
    search.goToResults();
    var id = search.getHistoryResultSelector(url);
    var result = client.helper.waitForElement(id);

    // Click result and check app loads
    result.click();
    client.switchToFrame();
    rocketbar.switchToBrowserFrame(url);

    // Go home
    client.switchToFrame();
    home.pressHomeButton();
    client.apps.switchToApp(home.URL);

    // Input a different url and press enter to visit
    home.focusRocketBar();
    rocketbar.enterText(url2 + '\uE006');
    rocketbar.switchToBrowserFrame(url2);
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
    assert.equal(client.findElements(search.Selectors.firstPlace).length, 0);
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
      return client.findElements(search.Selectors.firstPlace).length === 1;
    }.bind(this));

    // Wait for a second and check we dont get extra results
    client.helper.wait(1000);
    assert.equal(client.findElements(search.Selectors.firstPlace).length, 1);
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
