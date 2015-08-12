'use strict';
var assert = require('assert');

marionette('Homescreen - Localization', function() {

  var client = marionette.client({
    profile: require(__dirname + '/client_options.js'),
    desiredCapabilities: { raisesAccessibilityExceptions: true }
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
        'language.current': 'qps-ploc'
      });
    });
    client.switchToFrame(system.getHomescreenIframe());

    // Localization can be async, wait for the content to update
    var newIconName = home.localizedAppName('settings', 'qps-ploc');
    client.waitFor(function() {
      return !!home.getIconByName(newIconName);
    });
  });

  test('Menu option localization', function() {
    // Change the language to french
    client.switchToFrame();
    client.executeAsyncScript(function() {
      var req = navigator.mozSettings.createLock().set({
        'language.current': 'qps-ploc'
      });

      req.onsuccess = function() {
        marionetteScriptFinished();
      };
    });
    client.switchToFrame(system.getHomescreenIframe());

    home.openSettingsMenu();

    var expected = home.l10n('cancel-action');
    client.waitFor(function(){
      return home.settingsDialogButtons.pop().text() === expected;
    });
  });
});
