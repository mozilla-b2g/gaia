'use strict';
/* global __dirname */

var Pinning = require(
  '../../../../apps/system/test/marionette/lib/pinning_the_web');
var Bookmark = require('../../../../apps/system/test/marionette/lib/bookmark');
var Server = require('../../../../shared/test/integration/server');

marionette('Homescreen - Pinned Site Edit', function() {
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

    url = server.url('sample.html');
    client.switchToFrame();
    pinning.openAndPinSiteFromBrowser(url);
    system.dismissBanner();

    system.tapHome();
    home.waitForLaunch();
  });

  test('pressing enter after renaming the pinned site', function() {
    var icon = home.getIcon(url);

    home.scrollIconToCenter(icon);
    actions.longPress(icon, 1).perform();
    home.renameButton.tap();

    client.switchToFrame();
    bookmark.renameAndPressEnter('renamed');
    client.switchToFrame(system.getHomescreenIframe());

    client.waitFor(function() {
      return home.getIconText(icon) === 'renamed';
    });
  });
});
