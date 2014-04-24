'use strict';

/* globals __dirname */

var System = require('../../../system/test/marionette/lib/system');
var Search = require('./lib/search');
var Rocketbar = require('../../../system/test/marionette/lib/rocketbar.js');
var Server = require('../../../../shared/test/integration/server');
var assert = require('assert');

marionette('Places tests', function() {

  var client = marionette.client(Rocketbar.clientOptions);
  var search, server, rocketbar, system;

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
    search = new Search(client);
    rocketbar = new Rocketbar(client);
    system.waitForStartup();
  });

  test('Search for previously visited URL', function() {
    var url = server.url('sample.html');
    rocketbar.focus();
    rocketbar.enterText(url + '\uE006');
    rocketbar.waitForBrowserFrame();
    client.switchToFrame();
    rocketbar.focus();
    rocketbar.enterText(url);
    search.goToResults();
    search.checkResult('firstPlace', 'Sample page');
  });

  test('Search for a string that doesnt match visited url', function() {
    var url = server.url('sample.html');
    rocketbar.focus();
    rocketbar.enterText(url + '\uE006');
    rocketbar.waitForBrowserFrame();
    client.switchToFrame();
    rocketbar.focus();
    rocketbar.enterText('non_matching_string');
    search.goToResults();
    assert.equal(client.findElements(Search.Selectors.firstPlace).length, 0);
  });

  test('Ensures urls visited twice only show in results once', function() {
    var url = server.url('sample.html');
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

  test('Ensure favicon is loaded', function() {
    var url = server.url('favicon.html');
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
