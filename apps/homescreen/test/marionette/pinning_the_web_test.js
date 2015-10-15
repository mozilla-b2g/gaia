'use strict';
/* global __dirname */

var Server = require('../../../../shared/test/integration/server');
var Rocketbar = require('../../../system/test/marionette/lib/pinning_the_web');

marionette('Homescreen - Pin the web', function() {
  var options = require(__dirname + '/client_options_bookmarks.js');
  options.settings['dev.gaia.pinning_the_web'] = true;
  var client = marionette.client({
    profile: options
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

  test('Pinning a site from the site icon', function() {
    var numIcons = home.visibleIcons.length;
    var url = server.url('sample.html');

    client.switchToFrame();
    pinning.openAndPinSite(url);

    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());

    client.waitFor(function() {
      return numIcons + 1 === home.visibleIcons.length;
    });
  });

  test('Pinning a site from the browser context menu', function() {
    var numIcons = home.visibleIcons.length;
    var url = server.url('sample.html');

    client.switchToFrame();
    pinning.openAndPinSiteFromBrowser(url);
    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());

    client.waitFor(function() {
      return numIcons + 1 === home.visibleIcons.length;
    });
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
