'use strict';
/* global __dirname */

var assert = require('assert');

marionette('Homescreen - verticalhome migration', function() {
  var client = marionette.client({
    profile: require(__dirname + '/client_options_verticalhome.js')
  });
  var actions, verticalhome, home, system;

  setup(function() {
    actions = client.loader.getActions();
    verticalhome = client.loader.getAppClass('verticalhome');
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    verticalhome.waitForLaunch();
  });

  test('App order is imported from verticalhome', function() {
    // Drag the second icon to the first position so we differ from the
    // default settings.
    var icon1 = verticalhome.getNthIcon(1);
    var icon2 = verticalhome.getNthIcon(2);
    actions.press(icon2).wait(1).move(icon1).release().wait(1).perform();
    verticalhome.exitEditMode();

    // Restart the home screen so that icon DOM order corresponds with actual
    // order.
    verticalhome.restart();

    // Record the names of all the apps and bookmarks (these are the only
    // items that are migrated)
    var iconNames =
      client.findElements('#icons div.icon:not(.placeholder):not(.collection)').
        map(function(icon) {
          return icon.findElement('.title').text();
        });

    // Request migration to new home screen
    client.executeScript(function() {
      window.wrappedJSObject.app.itemStore.migrate(
        'app://homescreen.gaiamobile.org/manifest.webapp');
    });
    client.switchToFrame();
    home.waitForLaunch();

    // Verify icon order matches
    var importedIconNames = home.visibleIcons.map(function(icon) {
      return home.getIconText(icon);
    });

    var nIcons = iconNames.length;
    assert.equal(importedIconNames.length, nIcons);
    for (var i = 0; i < nIcons; i++) {
      assert.equal(importedIconNames[i], iconNames[i]);
    }
  });
});
