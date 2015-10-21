'use strict';

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');
var Bookmark = require('./lib/bookmark');

marionette('AppWindowManager - Pinned sites',
  function() {

  var client = marionette.client({
    profile: {
      settings: {
        'dev.gaia.pinning_the_web': true
      }
    }
  });

  var home, rocketbar, server, search, system, url, nApps, bookmark;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  function waitForBrowser(url) {
    client.helper.waitForElement(
      'div[transition-state="opened"] iframe[src="' + url + '"]');
  }

  function bookmarkSite(url) {
    bookmark.openAndSave(url);
    var numApps = system.getAppWindows().length;
    client.executeScript(function(url) {
      var win = window.wrappedJSObject;
      win.appWindowManager.getActiveApp().kill();
    }, [url]);
    client.waitFor(function() {
      return numApps === system.getAppWindows().length;
    });
    client.switchToFrame();
  }

  setup(function() {
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    system = client.loader.getAppClass('system');
    search = client.loader.getAppClass('search');
    bookmark = new Bookmark(client);
    system.waitForFullyLoaded();
    url = server.url('sample.html');
    bookmarkSite(url);
    nApps = system.getAppWindows().length;
  });

  test('reuses the same window on window.open() if in the scope', function() {
    var currentNApps;
    var url2 = server.url('darkpage.html');

    system.tapHome();
    rocketbar.homescreenFocus();
    rocketbar.enterText(url2, true);
    waitForBrowser(url2);

    currentNApps = system.getAppWindows().length;
    assert.equal(nApps + 1, currentNApps, 'new window from the rocketbar');

    system.tapHome();
    home.launchApp(url);
    waitForBrowser(url2);

    currentNApps = system.getAppWindows().length;
    assert.equal(nApps + 1, currentNApps, 'reuses window from the bookmark');
  });

  test('opens a new window on window.open() if not in the scope', function() {
    var currentNApps;
    var url2 = 'http://test.test/test';

    system.tapHome();
    rocketbar.homescreenFocus();
    rocketbar.enterText(url2, true);
    waitForBrowser(url2);


    currentNApps = system.getAppWindows().length;
    assert.equal(nApps + 1, currentNApps, 'new window from the rocketbar');

    system.tapHome();
    home.launchApp(url);
    waitForBrowser(url);

    currentNApps = system.getAppWindows().length;
    assert.equal(nApps + 2, currentNApps, 'new window from the bookmark');
  });

  test('Tapping the browser opens the last unpinned instance', function() {
    var url2 = 'http://test.test/test';

    system.tapHome();
    rocketbar.homescreenFocus();
    rocketbar.enterText(url2, true);
    waitForBrowser(url2);

    system.tapHome();
    home.launchApp(url);
    waitForBrowser(url);

    system.tapHome();
    // Twice for scrolling to the top
    system.tapHome();
    home.launchApp(search.URL);
    waitForBrowser(url2);
  });

  test('Tapping the browser opens a new window if no unpinned', function() {
    system.tapHome();
    home.launchApp(url);
    waitForBrowser(url);

    system.tapHome();
    // Twice for scrolling to the top
    system.tapHome();
    home.launchApp(search.URL);
    waitForBrowser(search.NEW_TAB_URL);
  });
});
