'use strict';

var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');
var PinTheWeb = require('./lib/pinning_the_web');
var UtilityTray = require('./lib/utility_tray.js');
var assert = require('assert');

marionette('Pinning the Web', function() {

  var client = marionette.client();

  var rocketbar, server, system, actions, home, pinTheWeb, utilityTray;

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
    system = client.loader.getAppClass('system');
    home = client.loader.getAppClass('homescreen');
    rocketbar = new Rocketbar(client);
    pinTheWeb = new PinTheWeb(client);
    utilityTray = new UtilityTray(client);
    system.waitForFullyLoaded();
    actions = client.loader.getActions();
  });

  function lastIconMatches(id) {
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
    client.waitFor(function() {
      var ids = home.getIconIdentifiers();
      return id == ids[ids.length - 1];
    });
  }

  test('Pin site', function() {
    // Count the current number of site icons
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
    var numIcons = 0;
    client.waitFor(function() {
      numIcons = home.visibleIcons.length;
      return numIcons > 0;
    });

    var url = server.url('sample.html');
    pinTheWeb.openAndPinSiteFromBrowser(url);

    assert(pinTheWeb.chromeIsPinned());

    // Check that browser chrome expands when tapped
    actions.wait(1).tap(system.appUrlbar).perform();
    client.waitFor(function() {
      return !pinTheWeb.chromeIsPinned();
    });

    // Check that browser chrome focuses on second tap
    actions.tap(system.appUrlbar).perform();
    client.waitFor(function() {
      return rocketbar.backdrop.displayed();
    });
    assert(true, 'browser chrome can be manually expanded');

    // Check that icon was added to homescreen
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
    client.waitFor(function() {
      return home.visibleIcons.length == numIcons + 1;
    });
  });

  test('Pin site with start_url', function() {
    // Count the current number of site icons
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
    var numIcons = 0;
    client.waitFor(function() {
      numIcons = home.visibleIcons.length;
      return numIcons > 0;
    });

    var url = server.url('scoped/page_2.html');
    var start_url = server.url('scoped/page_1.html');
    pinTheWeb.openAndPinSiteFromBrowser(url);

    // Check that icon was added to homescreen
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
    lastIconMatches(start_url);
  });

  test('Unpin site from same url', function() {
    var url, lastIconId;

    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
    client.waitFor(function() {
      var ids = home.getIconIdentifiers();
      lastIconId = ids[ids.length - 1];
      return lastIconId;
    });
    client.switchToFrame();
    url = server.url('sample.html');
    pinTheWeb.openAndPinSiteFromBrowser(url);
    lastIconMatches(url);

    pinTheWeb.openAndPinSiteFromBrowser(url);
    lastIconMatches(lastIconId);
  });

  test('Unpin site from url in the scope', function() {
    var url, lastIconId;

    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
    client.waitFor(function() {
      var ids = home.getIconIdentifiers();
      lastIconId = ids[ids.length - 1];
      return lastIconId;
    });
    client.switchToFrame();
    url = server.url('scoped/page_1.html');
    pinTheWeb.openAndPinSiteFromBrowser(url);
    lastIconMatches(url);
    var url2 = server.url('scoped/page_2.html');
    pinTheWeb.openAndPinSiteFromBrowser(url2);
    lastIconMatches(lastIconId);
  });

  test('Pin a site from same origin', function() {
    var url, lastIconId;

    client.switchToFrame(system.getHomescreenIframe());
    client.waitFor(function() {
      var ids = home.getIconIdentifiers();
      lastIconId = ids[ids.length - 1];
      return lastIconId;
    });
    client.switchToFrame();
    url = server.url('sample.html');
    var url2 = server.url('app-name.html');
    pinTheWeb.openAndPinSiteFromBrowser(url);
    lastIconMatches(url);

    pinTheWeb.openAndPinSiteFromBrowser(url2);
    lastIconMatches(url2);
  });

  // Skip test since we are disabling pinning door hanger in 2.5
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1207710
  test.skip('Pin site from doorhanger', function() {
    // Count the current number of site icons
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
    var numIcons = 0;
    client.waitFor(function() {
      numIcons = home.numIcons;
      return numIcons > 0;
    });

    var url = server.url('sample.html');
    pinTheWeb.openAndPinSite(url);

    assert(pinTheWeb.chromeIsPinned());

    // Check that browser chrome expands when tapped
    actions.wait(1).tap(system.appUrlbar).perform();
    client.waitFor(function() {
      return !pinTheWeb.chromeIsPinned();
    });

    // Check that browser chrome focuses on second tap
    actions.tap(system.appUrlbar).perform();
    client.waitFor(function() {
      return rocketbar.backdrop.displayed();
    });
    assert(true, 'browser chrome can be manually expanded');

    // Check that icon was added to homescreen
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
    client.waitFor(function() {
      return home.numIcons == numIcons + 1;
    });
  });

  suite.skip('Unpin site from doorhanger', function() {
    var url, lastIconId;

    function lastIconMatches(id) {
      system.goHome();
      client.switchToFrame(system.getHomescreenIframe());
      client.waitFor(function() {
        var ids = home.getIconIdentifiers();
        return id == ids[ids.length - 1];
      });
    }

    setup(function() {
      system.tapHome();
      client.switchToFrame(system.getHomescreenIframe());
      client.waitFor(function() {
        var ids = home.getIconIdentifiers();
        lastIconId = ids[ids.length - 1];
        return lastIconId;
      });
      client.switchToFrame();
      url = server.url('sample.html');
      pinTheWeb.openAndPinSite(url);
      lastIconMatches(url);
    });

    test('Unpin site', function() {
      pinTheWeb.openAndPinSite(url);
      lastIconMatches(lastIconId);
    });
  });

  test('It does not affect window.open chrome', function() {
    var url = server.url('windowopen.html');
    var url2 = server.url('darkpage.html');

    rocketbar.appTitleFocus();
    rocketbar.enterText(url, true);
    system.gotoBrowser(url);
    client.helper.waitForElement('#trigger3').tap();
    client.switchToFrame();

    client.waitFor(function() {
      return client.findElement('iframe[data-url*="' + url2 + '"]');
    });

    var popupChrome = client.findElement('.appWindow.popupWindow.active');
    var classes = popupChrome.getAttribute('class');
    assert(classes.indexOf('collapsible') < 0);
  });

  test('Navigating away from a pinned site', function() {
    var url = server.url('remote_link.html');
    pinTheWeb.openAndPinSiteFromBrowser(url);
    client.switchToFrame();

    var classes = system.currentWindow.getAttribute('class');
    assert(classes.indexOf('collapsible') < 0);

    system.gotoBrowser(url);
    var link = client.helper.waitForElement('#remote-link');
    link.click();
    client.switchToFrame();
    client.waitFor(function() {
      classes = system.currentWindow.getAttribute('class');
      return classes.indexOf('collapsible') > 0;
    });
  });

  test('Pin a page', function() {
    var url = server.url('sample.html');

    client.switchToFrame();
    pinTheWeb.openAndPinPage(url);
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());

    client.waitFor(function() {
      return home.visibleCards.length === 1;
    });
  });

  test('Unpin a page', function() {
    var url = server.url('sample.html');

    client.switchToFrame();
    pinTheWeb.openAndPinPage(url);
    system.goHome();
    client.switchToFrame(system.getHomescreenIframe());

    client.waitFor(function() {
      return home.visibleCards.length === 1;
    });

    client.switchToFrame();
    pinTheWeb.openAndPinPage(url);
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
    assert(home.visibleCards.length === 0, 'There is no pinned pages');
  });

  test('Opening quick settings should close pin dialog', function() {
    var url = server.url('sample.html');

    client.switchToFrame();
    pinTheWeb.openPinDialog(url);
    var pinDialog = pinTheWeb.pinDialog;

    utilityTray.open();
    utilityTray.quickSettings.tap();

    client.helper.waitForElementToDisappear(pinDialog);
  });
});
