'use strict';
var assert = require('assert');

var Home2 = require('./lib/home2');
var System = require('../../../../apps/system/test/marionette/lib/system');

marionette('Vertical - Localization', function() {

  var client = marionette.client(Home2.clientOptions);
  var home, system;

  setup(function() {
    home = new Home2(client);
    system = new System(client);
    system.waitForStartup();
    home.waitForLaunch();
  });

  test('Localization updates icon names', function() {
    var settingsManifestUrl = 'app://settings.gaiamobile.org/manifest.webapp';
    var settingsIcon = home.getIconByIdentifier(settingsManifestUrl);
    assert.equal(
      settingsIcon.text(),
      home.localizedAppName('settings', 'en-US'));

    client.executeScript(function() {
      navigator.mozSettings.createLock().set({
        'language.current': 'fr'
      });
    });
    settingsIcon = home.getIconByIdentifier(settingsManifestUrl);
    assert.equal(
      settingsIcon.text(),
      home.localizedAppName('settings', 'fr'));
  });

});
