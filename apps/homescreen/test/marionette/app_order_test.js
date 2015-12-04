'use strict';
/* global __dirname */

var assert = require('assert');

marionette('Homescreen - App order', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options_bookmarks.js')
  });
  var actions, home, system;

  setup(function() {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  test('App order is retained after restart', function() {
    // Drag icon to a different place
    var icons = home.visibleIcons;
    var location1 = icons[0].location();
    var location2 = icons[1].location();
    actions.wait(0.5).press(icons[0]).wait(0.5).
      move(icons[1]).release().wait(0.5).perform();

    client.waitFor(function() {
      return icons[0].location().x === location2.x &&
             icons[1].location().x === location1.x;
    });

    // Wait for the icon order to be saved
    var ids = home.getIconIdentifiers();
    var numIcons = ids.length;
    client.waitFor(function() {
      var order = client.executeAsyncScript(function() {
        window.wrappedJSObject.appWindow.apps.metadata.getAll().then(
          marionetteScriptFinished);
      });

      // The order array is stored in order, but also contains non-visible
      // icons, so just skip unknown entries.
      var correctlyPlacedIcons = 0;
      for (var i = 0, iLen = order.length; i < iLen; i++) {
        if (order[i].id.startsWith(ids[correctlyPlacedIcons])) {
          ++ correctlyPlacedIcons;
        }
      }
      return correctlyPlacedIcons === numIcons;
    });

    // Test that icon ordering is retained after a restart
    home.restart();

    client.waitFor(function() {
      return home.visibleIcons.length === numIcons;
    });

    var newIds = home.getIconIdentifiers();
    for (var i = 0, iLen = ids.length; i < iLen; i++) {
      assert.equal(ids[i], newIds[i]);
    }
  });

});
