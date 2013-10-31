var assert = require('assert'),
    NotificationTest = require('./lib/notification').NotificationTest,
    NotificationList = require('./lib/notification').NotificationList,
    Marionette = require('marionette-client'),
    util = require('util');

marionette('notification tests', function() {
  var client = marionette.client();
  var notificationList = new NotificationList(client);

  test('fire notification', function() {
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
              'Lock screen notification contains all fields');
  });

  test('system replace notification', function() {
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
    assert.ok(!notificationList.contains(newDetails),
              'Utility replaced notification should not exist');
    notificationList.refreshLockScreen();
    assert.ok(notificationList.containsLockScreen(oldDetails),
              'Lock screen unreplaced notification should exist');
    assert.ok(!notificationList.containsLockScreen(newDetails),
              'Lock screen replaced notification should not exist');

    var newNotify = new NotificationTest(client, newDetails);
    notificationList.refresh();
    assert.ok(!notificationList.contains(oldDetails),
              'Utility unreplaced notification should not exist');
    assert.ok(notificationList.contains(newDetails),
              'Utility replaced notification should exist');
    notificationList.refreshLockScreen();
    assert.ok(!notificationList.containsLockScreen(oldDetails),
              'Lock screen unreplaced notification should not exist');
    assert.ok(notificationList.containsLockScreen(newDetails),
              'Lock screen replaced notification should exists');
  });

  test('close notification', function() {
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
    assert.ok(!notificationList.contains(details),
              'notification should not be in list after calling close');
    notificationList.refreshLockScreen();
    assert.ok(!notificationList.containsLockScreen(details),
              'notification should be in list before calling close');
  });

  // function to check if screen status is enabled/disabled
  var urls = {
    system: 'app://system.gaiamobile.org',
    email: 'app://email.gaiamobile.org'
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

});
