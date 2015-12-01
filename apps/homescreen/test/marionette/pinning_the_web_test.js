'use strict';
/* global __dirname */

var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('../../../system/test/marionette/lib/pinning_the_web');

marionette('Homescreen - Pin the web', function() {
  var options = require(__dirname + '/client_options_bookmarks.js');
  options.settings['layers.async-pan-zoom.enabled'] = false;
  options.settings['dev.gaia.pinning_the_web'] = true;
  var client = marionette.client({
    profile: options,
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var home, server, system, pinning;

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
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    pinning = new Rocketbar(client);
    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  // Skip test since we are disabling pinning door hanger in 2.5
  // See https://bugzilla.mozilla.org/show_bug.cgi?id=1207710
  test.skip('Pinning a site from the site icon', function() {
    var url = server.url('sample.html');

    client.switchToFrame();
    pinning.openAndPinSite(url);

    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());

    home.getIcon(url);
  });

  test('Pinning a site from the browser context menu', function() {
    var url = server.url('sample.html');

    client.switchToFrame();
    pinning.openAndPinSiteFromBrowser(url);
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());

    home.getIcon(url);
  });

  test('Pinning a page adds a card to the homescreen', function() {
    var url = server.url('sample.html');

    client.switchToFrame();
    pinning.openAndPinPage(url);
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());

    client.waitFor(function() {
      return home.visibleCards.length === 1;
    });
  });

});
