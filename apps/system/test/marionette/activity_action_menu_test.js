'use strict';

(function() {
  var Messages =
    require('../../../../disabled_apps/sms/test/marionette/lib/messages');
  var UtilityTray = require('./lib/utility_tray');
  var assert = require('assert');

  marionette('activity action menu test', function() {
    var messagesApp, system, utilityTray, composer;

    var client = marionette.client({
      profile: {
        prefs: {
          'focusmanager.testmode': true
        }
      }
    });

    setup(function() {
      system = client.loader.getAppClass('system');
      messagesApp = Messages.create(client);
      messagesApp.loadMocks();
      utilityTray = new UtilityTray(client);
      messagesApp.launch();
      messagesApp.Inbox.navigateToComposer();
      system.waitForKeyboard();
      messagesApp.switchTo();
      composer = messagesApp.Composer;

      client.waitFor(function() {
        return composer.attachButton.enabled();
      });
      composer.attachButton.tap();
      client.switchToFrame();
      system.waitForActivityMenu();
    });

    test('works after opening an app', function() {
      utilityTray.open();
      utilityTray.quickSettings.click();
      messagesApp.launch();
      composer.attachButton.tap();
      client.switchToFrame();
      system.waitForActivityMenu();
    });

    test('works after home button', function(done) {
      system.tapHome();
      messagesApp.launch();
      composer.attachButton.tap();
      client.switchToFrame();
      setTimeout(function() {
        system.waitForActivityMenu();
        done();
      }, 1000);
    });

    test('it only creates 1 action menu div', function() {
      system.cancelActivity.tap();
      messagesApp.switchTo();
      composer.attachButton.tap();
      client.switchToFrame();
      system.waitForActivityMenu();
      var actionMenus = client.findElements('.action-menu');
      assert.ok(actionMenus.length === 1);
    });
  });
}());
