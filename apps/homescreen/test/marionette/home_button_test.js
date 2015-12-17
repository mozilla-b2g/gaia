'use strict';
/* global __dirname */

var Pinning = require(
  '../../../../apps/system/test/marionette/lib/pinning_the_web');
var Bookmark = require('../../../../apps/system/test/marionette/lib/bookmark');
var Server = require('../../../../shared/test/integration/server');
var assert = require('assert');

marionette('Homescreen - Home button', function() {
  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var actions, bookmark, pinning, home, server, system;

  suiteSetup(function(done) {
    Server.create(__dirname + '/fixtures/', function(err, _server) {
      server = _server;
      done();
    });
  });

  suiteTeardown(function() {
    server.stop();
  });

  var url;
  setup(function() {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    pinning = new Pinning(client);
    bookmark = new Bookmark(client, server);
    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  test('scroll to the top of the screen', function() {
    client.executeScript(function(scrollable) {
      scrollable.scrollTop = 100;
    }, [home.appsScrollable]);

    system.tapHome();
    home.waitForLaunch();

    assert.equal(client.executeScript(function(scrollable) {
      return scrollable.scrollTop;
    }, [home.appsScrollable]), 0);
  });

  test('exit edit mode', function() {
    url = server.url('sample.html');
    client.switchToFrame();
    pinning.openAndPinSiteFromBrowser(url);
    system.dismissBanner();

    system.tapHome();
    home.waitForLaunch();

    var icon = home.getIcon(url);

    home.scrollIconToCenter(icon);
    actions.longPress(icon, 1).perform();

    system.tapHome();
    home.waitForLaunch();

    assert.equal(client.executeScript(function() {
      return document.body.classList.contains('edit-mode');
    }), false);
  });
});
