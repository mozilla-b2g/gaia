var assert = require('assert'),
    NotificationTest = require('./lib/notification').NotificationTest,
    NotificationList = require('./lib/notification').NotificationList,
    Marionette = require('marionette-client'),
    util = require('util');

marionette('notification tests', function() {
  var LOCKSCREEN_ORIGIN = 'app://lockscreen.gaiamobile.org';
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });
  var notificationList = new NotificationList(client);

  test('fire notification', function() {
    client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(
        new window.wrappedJSObject.CustomEvent('request-lock'));
    });
    client.waitFor(function() {
      var result = client.executeScript(function() {
        return window.wrappedJSObject.System.locked;
      });
      return result;
    });
    var details = {tag: 'test tag',
                   title: 'test title',
                   body: 'test body',
                   dir: 'rtl',
                   lang: 'en'};
    var notify = new NotificationTest(client, details);
    client.apps.switchToApp(LOCKSCREEN_ORIGIN);
    notificationList.refreshLockScreen();
    assert.ok(notificationList.containsLockScreen(details),
              'Lock screen notification contains all fields: ' +
               JSON.stringify(notificationList.lockScreenNotifications));
              // Would be empty array...
  });

  test('system replace notification', function() {
    client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(
        new window.wrappedJSObject.CustomEvent('request-lock'));
    });
    client.waitFor(function() {
      var result = client.executeScript(function() {
        return window.wrappedJSObject.System.locked;
      });
      return result;
    });
    var oldDetails = {tag: 'test tag, replace',
                      title: 'test title, replace',
                      body: 'test body, replace',
                      dir: 'rtl',
                      lang: 'en'};
    var newDetails = {tag: 'test tag, replace',
                      title: 'new test title, replace',
                      body: 'new test body, replace',
                      dir: 'ltr',
                      lang: 'sr-Cyrl'};

    var notify = new NotificationTest(client, oldDetails);
    client.apps.switchToApp(LOCKSCREEN_ORIGIN);
    notificationList.refreshLockScreen();
    assert.ok(notificationList.containsLockScreen(oldDetails),
              'Lock screen unreplaced notification should exist');
    assert.ok(!notificationList.containsLockScreen(newDetails),
              'Lock screen replaced notification should not exist');
    client.switchToFrame();
    var newNotify = new NotificationTest(client, newDetails);
    client.apps.switchToApp(LOCKSCREEN_ORIGIN);
    notificationList.refreshLockScreen();
    assert.ok(!notificationList.containsLockScreen(oldDetails),
              'Lock screen unreplaced notification should not exist');
    assert.ok(notificationList.containsLockScreen(newDetails),
              'Lock screen replaced notification should exists');
  });

  test('close notification', function() {
    client.executeScript(function() {
      window.wrappedJSObject.dispatchEvent(
        new window.wrappedJSObject.CustomEvent('request-lock'));
    });
    client.waitFor(function() {
      var result = client.executeScript(function() {
        return window.wrappedJSObject.System.locked;
      });
      return result;
    });
    var details = {tag: 'test tag, close',
                   title: 'test title, close',
                   body: 'test body, close'};
    var notify = new NotificationTest(client, details);
    assert.ok(notify.close(), 'notification closed correctly');
    client.apps.switchToApp(LOCKSCREEN_ORIGIN);
    notificationList.refreshLockScreen();
    assert.ok(!notificationList.containsLockScreen(details),
              'notification should be in list before calling close');
  });
});
