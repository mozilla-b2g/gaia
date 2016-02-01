'use strict';
var assert = require('assert');

marionette('Homescreen - Localization', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js')
  });
  var actions, home, system;

  setup(function() {
    actions = client.loader.getActions();
    home = client.loader.getAppClass('homescreen');
    system = client.loader.getAppClass('system');
    system.waitForFullyLoaded();
    home.waitForLaunch();
  });

  test('Localization updates icon names', function() {
    var settingsIcon = home.getIconByName('Settings');
    assert.equal(
      home.getIconText(settingsIcon),
      home.localizedAppName('settings', 'en-US'));

    client.switchToFrame();
    client.executeScript(function() {
      navigator.mozSettings.createLock().set({
        'language.current': 'fr-x-psaccent'
      });
    });
    client.switchToFrame(system.getHomescreenIframe());

    // Localization can be async, wait for the content to update
    var newIconName = home.localizedAppName('settings', 'fr-x-psaccent');
    client.waitFor(function() {
      return !!home.getIconByName(newIconName);
    });
  });
});
