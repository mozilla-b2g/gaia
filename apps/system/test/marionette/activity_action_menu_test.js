'use strict';

(function() {
  var Messages = require('../../../sms/test/marionette/lib/messages');
  var UtilityTray = require('./lib/utility_tray');

  marionette('activity action menu test', function() {
    var messagesApp, system, utilityTray;

    var client = marionette.client({
      prefs: {
        'focusmanager.testmode': true
      }
    });

    setup(function() {
      system = client.loader.getAppClass('system');
      messagesApp = Messages.create(client);
      utilityTray = new UtilityTray(client);
    });

    test('works after opening an app', function() {
      messagesApp.launch();
      messagesApp.Inbox.navigateToComposer();
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
  });
}());
