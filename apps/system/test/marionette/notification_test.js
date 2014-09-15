var assert = require('assert'),
    NotificationTest = require('./lib/notification').NotificationTest,
    NotificationList = require('./lib/notification').NotificationList,
    Marionette = require('marionette-client'),
    util = require('util'),
    fs = require('fs');

var SHARED_PATH = __dirname + '/../../../../shared/test/integration/';

marionette('notification tests', function() {
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null
    }
  });
  var actions = new Marionette.Actions(client);
  var notificationList = new NotificationList(client);

  test('fire notification', function() {
    // Need to trigger LockScreenWindow manager with screenchange event.
    client.executeScript(function(enabled) {
      window.wrappedJSObject.ScreenManager.turnScreenOff(true);
      window.wrappedJSObject.ScreenManager.turnScreenOn(true);
    });
    var details = {tag: 'test tag',
                   title: 'test title',
                   body: 'test body',
                   dir: 'rtl',
                   lang: 'en'};
    var notify = new NotificationTest(client, details);
    notificationList.refresh();
    assert.ok(notificationList.contains(details),
              'Utility notification notification contains all fields');
    notificationList.refreshLockScreen();
    assert.ok(notificationList.containsLockScreen(details),
              'Lock screen notification contains all fields: ' +
               JSON.stringify(notificationList.lockScreenNotifications));
              // Would be empty array...
  });

  test('swipe up should hide the toast', function() {
    var toaster = dispatchNotification(client);
    actions.flick(toaster, 50, 30, 50, 1, 300).perform(function() {
      assert.equal(toaster.displayed(), false);
    });
  });

  test('swipe right should not hide the toast', function() {
    var toaster = dispatchNotification(client);
    actions.flick(toaster, 10, 30, 80, 30, 300).perform(function() {
      assert.equal(toaster.displayed(), true);
    });
  });

  test('system replace notification', function() {
    // Need to trigger LockScreenWindow manager with screenchange event
    client.executeScript(function(enabled) {
      window.wrappedJSObject.ScreenManager.turnScreenOff(true);
      window.wrappedJSObject.ScreenManager.turnScreenOn(true);
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
    notificationList.refresh();
    assert.ok(notificationList.contains(oldDetails),
              'Utility unreplaced notification should exist');
    assert.ok(notificationList.contains(newDetails, true),
              'Utility replaced notification should not exist');
    notificationList.refreshLockScreen();
    assert.ok(notificationList.containsLockScreen(oldDetails),
              'Lock screen unreplaced notification should exist');
    assert.ok(notificationList.containsLockScreen(newDetails, true),
              'Lock screen replaced notification should not exist');

    var newNotify = new NotificationTest(client, newDetails);
    notificationList.refresh();
    assert.ok(notificationList.contains(oldDetails, true),
              'Utility unreplaced notification should not exist');
    assert.ok(notificationList.contains(newDetails),
              'Utility replaced notification should exist');
    notificationList.refreshLockScreen();
    assert.ok(notificationList.containsLockScreen(oldDetails, true),
              'Lock screen unreplaced notification should not exist');
    assert.ok(notificationList.containsLockScreen(newDetails),
              'Lock screen replaced notification should exists');
  });

  test('close notification', function() {
    client.executeScript(function(enabled) {
      window.wrappedJSObject.ScreenManager.turnScreenOff(true);
      window.wrappedJSObject.ScreenManager.turnScreenOn(true);
    });
    var details = {tag: 'test tag, close',
                   title: 'test title, close',
                   body: 'test body, close'};
    var notify = new NotificationTest(client, details);
    notificationList.refresh();
    assert.ok(notificationList.contains(details),
              'notification should be in list before calling close');
    notificationList.refreshLockScreen();
    assert.ok(notificationList.containsLockScreen(details),
              'notification should be in list before calling close');
    assert.ok(notify.close(), 'notification closed correctly');
    notificationList.refresh();
    assert.ok(notificationList.contains(details, true),
              'notification should not be in list after calling close');
      // Do loop wait since we would close notification with delay
      // on LockScreen notification, after we make it actionable.
    notificationList.refreshLockScreen();
    assert.ok(notificationList.containsLockScreen(details, true),
              'notification should not be in list after calling close');
  });

  // function to check if screen status is enabled/disabled
  var urls = {
    system: 'app://system.gaiamobile.org',
    email: 'app://email.gaiamobile.org',
    calendar: 'app://calendar.gaiamobile.org'
  };
  var screenStatusIs = function(enabled) {
    return client.executeScript(function(enabled) {
      return enabled ?
        window.wrappedJSObject.ScreenManager.screenEnabled :
        !window.wrappedJSObject.ScreenManager.screenEnabled;
    }, [enabled]);
  };
  var screenStatusIsOn = screenStatusIs.bind(null, true);
  var screenStatusIsOff = screenStatusIs.bind(null, false);

  // skipping this test until we can figure out why we see intermittent oranges
  // see also: bug 916730
  test.skip('email notification should not wake screen', function() {
    client.switchToFrame();
    client.executeScript(function() {
      window.wrappedJSObject.ScreenManager.turnScreenOff(true);
    });
    client.waitFor(screenStatusIsOff);
    client.apps.launch(urls.email);
    client.apps.switchToApp(urls.email);
    var notify =
          new NotificationTest(client,
                               '123', 'test title', 'test body');
    client.switchToFrame();
    var screenOn = screenStatusIsOn();
    assert.equal(screenOn, false, 'Screen should be off');
  });

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
    var notify = new NotificationTest(client, '123', 'test', 'test');
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
    var notify = new NotificationTest(client, '123', 'test', 'test');
    client.switchToFrame();

    assert.equal(fakeVibrationsNumber(), 0, 'the phone should not vibrate');

    dispatchVisibilityChangeEvent();

    assert.equal(fakeVibrationsNumber(), 1,
                 'the phone should have vibrated once');
  });
});

function dispatchNotification(client) {
  var details = {tag: 'test tag',
                 title: 'test title',
                 body: 'test body',
                 dir: 'rtl',
                 lang: 'en'};
  var toaster = client.findElement('#notification-toaster');
  var notify = new NotificationTest(client, details);

  client.helper.waitForElement('#notification-toaster.displayed');
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

