'use strict';

var assert = require('chai').assert;
var AmbientIndicator = require('./lib/ambient_indicator');
var UtilityTray = require('./lib/utility_tray');
var NotificationTest = require('./lib/notification').NotificationTest;
marionette('Ambient indicator', function() {

  var client = marionette.client({
    profile: {
      settings: {
        'notifications.resend': false
      }
    },
    desiredCapabilities: { raisesAccessibilityExceptions: true }
  });

  var ambientIndicator = new AmbientIndicator(client);
  var details, notification, system, utilityTray;

  setup(function() {
    utilityTray = new UtilityTray(client);
    system = client.loader.getAppClass('system');
  });

  suite('Ambient indicator', function() {
    setup(function() {
      details = {
        tag: 'test tag',
        title: 'test title',
        body: 'test body',
        dir: 'rtl',
        lang: 'en'
      };
      system.waitForFullyLoaded();
    });

    test('is shown when a notification arrives', function() {
      assert.ok(ambientIndicator.displayed === false);
      notification = new NotificationTest(client, details);
      client.waitFor(function() {
        return ambientIndicator.displayed;
      });
    });

    test('gets cleared when opening the tray', function() {
      assert.ok(ambientIndicator.displayed === false);
      notification = new NotificationTest(client, details);
      utilityTray.open();
      client.waitFor(function() {
        return !ambientIndicator.displayed;
      });
    });

    test('gets cleared when externaly removing the notification', function() {
      assert.ok(ambientIndicator.displayed === false);
      notification = new NotificationTest(client, details);
      client.waitFor(function() {
        return ambientIndicator.displayed;
      });
      notification.close();
      client.waitFor(function() {
        return !ambientIndicator.displayed;
      });
    });
  });

});
