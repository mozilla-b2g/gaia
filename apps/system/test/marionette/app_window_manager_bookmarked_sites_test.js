'use strict';

var assert = require('assert');
var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');
var Pinning = require('./lib/pinning_the_web');


marionette('AppWindowManager - Pinning sites',
  function() {

  var client = marionette.client({
    profile: {
      settings: {
        'dev.gaia.pinning_the_web': true,
        'homescreen.manifestURL':
          'app://homescreen.gaiamobile.org/manifest.webapp'
      }
    }
  });

  var home, rocketbar, server, search, system, url, nApps, pinning;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  function pinAndKill(url) {
    pinning.openAndPinSiteFromBrowser(url);
    // Kill the pinned browser window
    var winId = client.executeScript(function(url) {
      var win = window.wrappedJSObject;
      var activeApp = win.appWindowManager.getActiveApp();
      activeApp.kill();
      return activeApp.element.id;
    }, [url]);
    client.helper.waitForElementToDisappear('#' + winId);
    client.switchToFrame();
  }

  function openPin(url) {
    system.tapHome();
    client.waitFor(function() {
      return system.activeHomescreenFrame.displayed();
    });
    client.switchToFrame(system.getHomescreenIframe());
    var icon = home.getIcon(url);
    home.scrollIconToCenter(icon);
    icon.tap();
    client.switchToFrame();
  }

  setup(function() {
    home = client.loader.getAppClass('homescreen');
    rocketbar = new Rocketbar(client);
    system = client.loader.getAppClass('system');
    search = client.loader.getAppClass('search');
    pinning = new Pinning(client);
    system.waitForFullyLoaded();
    url = server.url('sample.html');
    pinAndKill(url);
    nApps = system.getAppWindows().length;
  });

  test('reuses the same window on window.open() if in the scope', function() {
    var currentNApps;
    var url2 = server.url('darkpage.html');

    system.tapHome();
    rocketbar.homescreenFocus();
    rocketbar.enterText(url2, true);
    system.waitForBrowser(url2);

    currentNApps = system.getAppWindows().length;
    assert.equal(nApps + 1, currentNApps, 'new window from the rocketbar');

    openPin(url);
    system.waitForBrowser(url2);

    currentNApps = system.getAppWindows().length;
    assert.equal(nApps + 1, currentNApps, 'reuses window from the pinned site');
  });

  test('opens a new window on window.open() if not in the scope', function() {
    var currentNApps;
    var url2 = 'http://test.test/test';

    system.tapHome();
    rocketbar.homescreenFocus();
    rocketbar.enterText(url2, true);
    system.waitForBrowser(url2);


    currentNApps = system.getAppWindows().length;
    assert.equal(nApps + 1, currentNApps, 'new window from the rocketbar');

    openPin(url);
    system.waitForBrowser(url);

    currentNApps = system.getAppWindows().length;
    assert.equal(nApps + 2, currentNApps, 'new window from the pinned site');
  });

  test('Tapping the browser opens the last unpinned instance', function() {
    var url2 = 'http://test.test/test';

    // Open test.test window.
    system.tapHome();
    rocketbar.homescreenFocus();
    rocketbar.enterText(url2, true);
    system.waitForBrowser(url2);

    // Open pin.
    openPin(url);
    system.waitForBrowser(url);

    // Bring the Browser icon into view.
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
    var icon = home.getIcon(search.URL);
    home.scrollIconToCenter(icon);
    client.helper.waitForElement(icon);

    // Sanity check that browser window is background.
    client.switchToFrame();
    assert.equal(false, system.browserIsDisplayed(url2),
      'browser window is not displayed before tapping icon');

    // Now launch the browser by tapping browser icon.
    client.switchToFrame(system.getHomescreenIframe());
    icon.tap();

    // Make sure unpinned window (test.test) is brought to foreground.
    client.switchToFrame();
    system.waitForBrowser(url2);
  });

  test('Tapping the browser opens a new window if no unpinned', function() {
    openPin(url);
    system.waitForBrowser(url);

    // Bring the Browser icon into view.
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
    var icon = home.getIcon(search.URL);
    home.scrollIconToCenter(icon);
    client.helper.waitForElement(icon);

    // Sanity check that browser window is background.
    client.switchToFrame();
    assert.equal(false, system.browserIsDisplayed(url),
      'browser window is not displayed before tapping icon');

    // Now launch the browser by tapping browser icon.
    client.switchToFrame(system.getHomescreenIframe());
    icon.tap();

    // Make sure new tab page comes up.
    client.switchToFrame();
    system.waitForBrowser(search.NEW_TAB_URL);
  });
});
