'use strict';
/* global __dirname */

var Pinning = require(
  '../../../../apps/system/test/marionette/lib/pinning_the_web');
var Server = require('../../../../shared/test/integration/server');

marionette('Homescreen - Pinned Sites', function() {
  var client = marionette.client();
  var pinning, home, server, system;

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
    pinning = new Pinning(client);
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  test('Pinning a site adds pin to homescreen', function() {
    var numIcons = home.visibleIcons.length;
    var url = server.url('sample.html');

    client.switchToFrame();
    pinning.openAndPinSiteFromBrowser(url);
    system.dismissBanner();

    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());

    client.waitFor(function() {
      return numIcons + 1 === home.visibleIcons.length;
    });
  });

});
