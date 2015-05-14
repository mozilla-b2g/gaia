'use strict';
/* jshint nonew: false */

var assert = require('assert'),
    NotificationTest = require('./lib/notification').NotificationTest,
    NotificationList = require('./lib/notification').NotificationList,
    Marionette = require('marionette-client'),
    fs = require('fs');

var SHARED_PATH = __dirname + '/../../../../shared/test/integration/';

marionette('notification tests', function() {
  var client = marionette.client();
  var system;
  var actions = new Marionette.Actions(client);
  var notificationList = new NotificationList(client);

  setup(function() {
    system = client.loader.getAppClass('system');
    system.waitForStartup();
    client.waitFor(function() {
      return system.activeHomescreenFrame.displayed();
    });
  });

  function dispatchNotification() {
    var details = {tag: 'test tag',
                   title: 'test title',
                   body: 'test body',
                   dir: 'rtl',
                   lang: 'en'};
    var toaster = client.findElement('#notification-toaster');
    new NotificationTest(client, details);

    client.helper.waitFor(function() {
      return client.findElement('#notification-toaster.displayed').displayed();
    });
    return toaster;
  }

  function dispatchVisibilityChangeEvent() {
    client.executeScript(function() {
      window.wrappedJSObject.__setDocumentVisibility(true);
      window.wrappedJSObject.dispatchEvent(new CustomEvent('visibilitychange'));
    });
  }

  function fakeVibrationsNumber() {
    return client.executeScript(function() {
      return window.wrappedJSObject.__fakeVibrationsNo;
    });
  }

  test.skip('fire notification', function() {
    var details = {tag: 'test tag',
                   title: 'test title',
                   body: 'test body',
                   dir: 'rtl',
                   lang: 'en'};
    new NotificationTest(client, details);
    notificationList.refresh();
    assert.ok(notificationList.contains(details),
              'Utility notification notification contains all fields');
  });

  test('swipe up should hide the toast', function() {
    var toaster = dispatchNotification(client);
    actions.flick(toaster, 50, 30, 50, -30, 300).perform(function() {
      client.waitFor(function() {
        return !toaster.displayed();
      }, {timeout: 1000});
    });
  });

  test('swipe right should not hide the toast', function() {
    var toaster = dispatchNotification(client);
    actions.flick(toaster, 10, 30, 80, 30, 300).perform(function() {
      assert.equal(toaster.displayed(), true);
    });
  });

  test.skip('system replace notification', function() {
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

    new NotificationTest(client, oldDetails);
    notificationList.refresh();
    assert.ok(notificationList.contains(oldDetails),
              'Utility unreplaced notification should exist');
    assert.ok(notificationList.contains(newDetails, true),
              'Utility replaced notification should not exist');

    new NotificationTest(client, newDetails);
    notificationList.refresh();
    assert.ok(notificationList.contains(oldDetails, true),
              'Utility unreplaced notification should not exist');
    assert.ok(notificationList.contains(newDetails),
              'Utility replaced notification should exist');
  });

  test('close notification', function() {
    var details = {tag: 'test tag, close',
                   title: 'test title, close',
                   body: 'test body, close'};
    var notify = new NotificationTest(client, details);
    notificationList.refresh();
    assert.ok(notificationList.contains(details),
              'notification should be in list before calling close');
    assert.ok(notify.close(), 'notification closed correctly');
    notificationList.refresh();
    assert.ok(notificationList.contains(details, true),
              'notification should not be in list after calling close');
  });

  var urls = {
    system: 'app://system.gaiamobile.org',
    email: 'app://email.gaiamobile.org',
    calendar: 'app://calendar.gaiamobile.org'
  };

  test('email notif should not vibrate the phone while asleep', function() {
    client.switchToFrame();
    client.executeScript(fs.readFileSync(
      SHARED_PATH + '/mock_navigator_vibrate.js', 'utf8'));

    // Mock turning the screen off
    client.executeScript(function() {
      window.wrappedJSObject.__setDocumentVisibility(false);
    });

    client.apps.launch(urls.email);
    client.apps.switchToApp(urls.email);
    new NotificationTest(client, '123', 'test', 'test');
    client.switchToFrame();

    // We have to check if the phone will vibrate when it'll wake up
    dispatchVisibilityChangeEvent();

    assert.equal(fakeVibrationsNumber(), 0, 'the phone should not vibrate');
  });

  test('calendar notif should vibrate the phone when waking up', function() {
    client.switchToFrame();
    client.executeScript(fs.readFileSync(
      SHARED_PATH + '/mock_navigator_vibrate.js', 'utf8'));

    // Mock screen off
    client.executeScript(function() {
      window.wrappedJSObject.__setDocumentVisibility(false);
    });

    client.apps.launch(urls.calendar);
    client.apps.switchToApp(urls.calendar);
    new NotificationTest(client, '123', 'test', 'test');
    client.switchToFrame();

    assert.equal(fakeVibrationsNumber(), 0, 'the phone should not vibrate');

    dispatchVisibilityChangeEvent();

    assert.equal(fakeVibrationsNumber(), 1,
                 'the phone should have vibrated once');
  });
});
