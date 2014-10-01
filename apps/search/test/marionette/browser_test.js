'use strict';

var Home2 = require('../../../verticalhome/test/marionette/lib/home2');
var System = require('../../../system/test/marionette/lib/system');
var Search = require('./lib/search');

var assert = require('chai').assert;

marionette('Browser test', function() {

  var client = marionette.client(Home2.clientOptions);
  var search, system;

  setup(function() {
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
});
