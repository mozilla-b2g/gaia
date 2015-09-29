'use strict';

var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('./lib/rocketbar');
var PinTheWeb = require('./lib/pinning_the_web');
var assert = require('assert');

marionette('Pinning the Web', function() {

  var client = marionette.client({
    profile: {
      prefs: {
        // APZ was causing a crash, so we disable it for this test.
        // see https://bugzilla.mozilla.org/show_bug.cgi?id=1200580
        'layers.async-pan-zoom.enabled': false
      },
      settings: {
        'dev.gaia.pinning_the_web': true
      }
    }
  });

  var rocketbar, server, system, actions, home, pinTheWeb;

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
    home = client.loader.getAppClass('verticalhome');
    rocketbar = new Rocketbar(client);
    pinTheWeb = new PinTheWeb(client);
    system.waitForFullyLoaded();
    actions = client.loader.getActions();
  });

  // Skip test since we are disabling pinning door hanger in 2.5
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1207710
  test.skip('Pin site', function() {
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

  test('it does not affect to window.open chrome', function() {
    var url = server.url('windowopen.html');
    var url2 = server.url('darkpage.html');

    rocketbar.homescreenFocus();
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

  suite.skip('Unpin site', function() {
    var url, lastIconId;

    function lastIconMatches(id) {
      system.tapHome();
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
      pinTheWeb.openAndUnpinSite(url);
      lastIconMatches(lastIconId);
    });
  });

});
