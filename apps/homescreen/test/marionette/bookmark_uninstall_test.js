'use strict';
/* global __dirname */

var assert = require('assert');

var Bookmark = require('../../../../apps/system/test/marionette/lib/bookmark');
var Server = require('../../../../shared/test/integration/server');

marionette('Homescreen - Bookmark Uninstall', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options_bookmarks.js')
  });
  var actions, bookmark, home, server, system;

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
    bookmark = new Bookmark(client, server);
    system.waitForFullyLoaded();
    home.waitForLaunch();

    url = server.url('sample.html');
    client.switchToFrame();
    bookmark.openAndSave(url);

    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());
  });

  test('removal of bookmark', function() {
    var icon = home.getIcon(url);

    // Drag the icon to the delete tray
    icon.scriptWith(function(el) {
      el.scrollIntoView(false);
    });

    actions.wait(0.5).press(icon).wait(0.5).perform();
    actions.move(home.uninstallTray).release().perform();

    client.switchToFrame();
    client.switchToFrame(system.getAppIframe(bookmark.URL));
    bookmark.removeButton.tap();

    // ensure the icon disappears
    client.switchToFrame();
    client.switchToFrame(system.getHomescreenIframe());
    client.helper.waitForElementToDisappear(icon);

    // ensure bookmark is gone upon restart
    home.restart();
    client.setSearchTimeout(20);
    icon = null;
    try {
      icon = home.getIcon(server.packageManifestURL);
    } catch(e) { }
    assert.ok(!icon, 'bookmark was not removed');
  });
});
