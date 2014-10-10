'use strict';

/* globals __dirname */

var Home2 = require('../../../verticalhome/test/marionette/lib/home2');
var System = require('../../../system/test/marionette/lib/system');
var Search = require('./lib/search');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require(
  '../../../../apps/system/test/marionette/lib/rocketbar');
var Home = require(
  '../../../../apps/verticalhome/test/marionette/lib/home2');

var assert = require('chai').assert;

marionette('Browser test', function() {

  var client = marionette.client(Home2.clientOptions);
  var home, search, system, server, rocketbar;

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
    rocketbar = new Rocketbar(client);
    home = new Home(client);
    search = new Search(client);
    system = new System(client);
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

  test('Ensure sim variant preloaded sites exist', function() {

    client.executeAsyncScript(function() {
      var settings = window.wrappedJSObject.navigator.mozSettings;
      var result = settings.createLock().set({
        'operatorResources.data.topsites': {
          'topSites': [{
            url: 'http://example1.org',
            title: 'Example1'
          }, {
            url: 'http://example2.org',
            title: 'Example2'
          }, {
            url: 'http://example3.org',
            title: 'Example3'
          }]
        }
      });
      result.onsuccess = function() {
        marionetteScriptFinished();
      };
    });

    client.apps.launch(Search.URL);
    client.apps.switchToApp(Search.URL);

    client.waitFor(function() {
      return search.getTopSites().length == 3;
    });
  });

  test('Ensure fallback to url when no place title', function() {

    client.executeAsyncScript(function() {
      var settings = window.wrappedJSObject.navigator.mozSettings;
      var result = settings.createLock().set({
        'operatorResources.data.topsites': {
          'topSites': [{url: 'http://example1.org'}]
        }
      });
      result.onsuccess = function() {
        marionetteScriptFinished();
      };
    });

    client.apps.launch(Search.URL);
    client.apps.switchToApp(Search.URL);

    client.waitFor(function() {
      return search.getTopSites().length == 1;
    });

    var topSite = search.getTopSites()[0];
    assert.equal(topSite.text(), 'http://example1.org');
  });

  test('Dont duplicate preloaded sites', function() {

    var url = server.url('sample.html');

    client.executeAsyncScript(function(url) {
      var settings = window.wrappedJSObject.navigator.mozSettings;
      var result = settings.createLock().set({
        'operatorResources.data.topsites': {
          'topSites': [{url: url}]
        }
      });
      result.onsuccess = function() {
        marionetteScriptFinished();
      };
    }, [url]);

    client.apps.launch(Search.URL);
    client.apps.switchToApp(Search.URL);

    // We have a single top site configured
    client.waitFor(function() {
      return search.getTopSites().length == 1;
    });

    // Visit the top site
    var topSite = search.getTopSites()[0];
    topSite.click();

    // Ensure it loads
    client.switchToFrame();
    rocketbar.switchToBrowserFrame(url);

    // Dispatch a home event to go home.
    client.switchToFrame();
    client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(new CustomEvent('home'));
    });
    home.waitForLaunch();

    // Reload the search app
    client.switchToFrame();
    client.apps.launch(Search.URL);
    client.apps.switchToApp(Search.URL);

    // We should still have a single top site
    client.waitFor(function() {
      return search.getTopSites().length == 1;
    });
  });

});
