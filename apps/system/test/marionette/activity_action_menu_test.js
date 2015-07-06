'use strict';

(function() {
  var Messages = require('../../../sms/test/marionette/lib/messages');
  var UtilityTray = require('./lib/utility_tray');
  var assert = require('assert');

  marionette('activity action menu test', function() {
    var messagesApp, system, utilityTray;

    var client = marionette.client({
      profile: {
        prefs: {
          'focusmanager.testmode': true
        }
      },
      desiredCapabilities: { raisesAccessibilityExceptions: true }
    });

    setup(function() {
      system = client.loader.getAppClass('system');
      messagesApp = Messages.create(client);
      utilityTray = new UtilityTray(client);
    });

    test('works after opening an app', function() {
      messagesApp.launch();
      messagesApp.Inbox.navigateToComposer();
      system.waitForKeyboard();
      var composer = messagesApp.Composer;

      client.waitFor(function() {
        return composer.attachButton.enabled();
      });
      composer.attachButton.tap();
      client.switchToFrame();
      system.waitForActivityMenu();
      utilityTray.open();
      utilityTray.quickSettings.click();
      messagesApp.launch();
      composer.attachButton.tap();
      client.switchToFrame();
      system.waitForActivityMenu();
    });

    test('works after home button', function(done) {
      messagesApp.launch();
      messagesApp.Inbox.navigateToComposer();
      system.waitForKeyboard();
      var composer = messagesApp.Composer;

      client.waitFor(function() {
        return composer.attachButton.enabled();
      });
      composer.attachButton.tap();
      client.switchToFrame();
      system.waitForActivityMenu();
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
      messagesApp.launch();
      messagesApp.Inbox.navigateToComposer();
      system.waitForKeyboard();
      var composer = messagesApp.Composer;

      client.waitFor(function() {
        return composer.attachButton.enabled();
      });
      composer.attachButton.tap();
      client.switchToFrame();
      system.waitForActivityMenu();
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
