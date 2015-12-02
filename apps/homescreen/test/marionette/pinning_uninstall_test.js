'use strict';
/* global __dirname */

var assert = require('assert');

var Pinning = require(
  '../../../../apps/system/test/marionette/lib/pinning_the_web');
var Bookmark = require('../../../../apps/system/test/marionette/lib/bookmark');
var Server = require('../../../../shared/test/integration/server');

marionette('Homescreen - Pinned Site Uninstall', function() {

  var client = marionette.client({
    desiredCapabilities: { raisesAccessibilityExceptions: false }
  });
  var actions, pinning, home, server, system, bookmark;

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
    bookmark = new Bookmark(client);
    system.waitForFullyLoaded();
    home.waitForLaunch();

    url = server.url('sample.html');
    client.switchToFrame();
    pinning.openAndPinSiteFromBrowser(url);
    system.dismissBanner();

    system.tapHome();
    home.waitForLaunch();
  });

  test('removal of pinned site', function() {
    var icon = home.getIcon(url);

    home.scrollIconToCenter(icon);
    actions.longPress(icon, 1).perform();
    home.removeButton.tap();

    // Confirm the dialog to ensure it was removed.
    // Note, remove dialog for pins still lives in bookmark app.
    client.switchToFrame();
    client.switchToFrame(system.getAppIframe(Bookmark.URL));
    bookmark.pinConfirmDialog('remove');

    // ensure the icon disappears
    client.switchToFrame();
    client.switchToFrame(system.getHomescreenIframe());
    client.helper.waitForElementToDisappear(icon);

    // ensure pinned site is gone upon restart
    home.restart();
    client.setSearchTimeout(20);
    icon = null;
    try {
      icon = home.getIcon(server.packageManifestURL);
    } catch(e) { }
    assert.ok(!icon, 'pinned site was not removed');
  });
});
