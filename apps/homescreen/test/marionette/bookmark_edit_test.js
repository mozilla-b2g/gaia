'use strict';
/* global __dirname */

var Bookmark = require('../../../../apps/system/test/marionette/lib/bookmark');
var Server = require('../../../../shared/test/integration/server');

marionette('Homescreen - Bookmark Edit', function() {
  var options = require(__dirname + '/client_options_bookmarks.js');
  options.settings['dev.gaia.pinning_the_web'] = false;
  var client = marionette.client({
    profile: options
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
    home.waitForLaunch();
  });

  test('pressing enter after renaming the bookmark', function() {
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
