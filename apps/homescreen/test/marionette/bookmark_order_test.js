'use strict';
/* global __dirname */

var assert = require('assert');
var Bookmark = require('../../../../apps/system/test/marionette/lib/bookmark');
var Server = require('../../../../shared/test/integration/server');

marionette('Homescreen - Bookmark order', function() {
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

  setup(function() {
    actions = client.loader.getActions();
    bookmark = new Bookmark(client, server);
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  test('Bookmark order is retained after restart', function() {
    // This test is very similar to app_order_test, but as bookmarks are
    // sourced from a different database and initialised separately to apps,
    // we need to test that their metadata is also retained across homescreen
    // restarts.

    // Add a bookmark
    var numIcons = home.visibleIcons.length;
    var url = server.url('sample.html');

    client.switchToFrame();
    bookmark.openAndSave(url);

    system.tapHome();
    client.switchToFrame(system.getHomescreenIframe());

    client.waitFor(function() {
      return numIcons + 1 === home.visibleIcons.length;
    });

    // Drag bookmark to a different place
    var icons = home.visibleIcons;

    icons[numIcons].scriptWith(function(el) {
      el.scrollIntoView();
    });

    var location1 = icons[numIcons].location();
    var location2 = icons[numIcons - 1].location();
    actions.wait(0.5).press(icons[numIcons]).wait(0.5).
      move(icons[numIcons - 1]).release().wait(0.5).perform();

    assert.equal(icons[numIcons].location().x, location2.x);
    assert.equal(icons[numIcons - 1].location().x, location1.x);

    // Test that icon order is retained after restart
    icons = home.visibleIcons.map(function(icon) {
      return home.getIconText(icon);
    });
    numIcons = icons.length;

    home.restart();

    client.waitFor(function() {
      return home.visibleIcons.length === numIcons;
    });

    var newIcons = home.visibleIcons.map(function(icon) {
      return home.getIconText(icon);
    });
    for (var i = 0, iLen = icons.length; i < iLen; i++) {
      assert.equal(icons[i], newIcons[i]);
    }
  });

});
