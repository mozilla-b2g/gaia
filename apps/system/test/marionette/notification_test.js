var assert = require('assert'),
    NotificationTest = require('./lib/notification').NotificationTest,
    NotificationList = require('./lib/notification').NotificationList,
    Marionette = require('marionette-client'),
    util = require('util');

marionette('notification tests', function() {
  var client = marionette.client();
  var notificationList = new NotificationList(client);

  test('fire notification', function() {
    var tag = 'test tag';
    var title = 'test title';
    var body = 'test body';
    var notify = new NotificationTest(client, tag, title, body);
    notificationList.refresh();
    assert.ok(notificationList.contains(title, body),
              'notification list contains the new notification');
  });

  test('replace notification', function() {
    var tag = 'test tag, replace';
    var oldTitle = 'test title, replace';
    var oldBody = 'test body, replace';
    var newTitle = 'new test title, replace';
    var newBody = 'new test body, replace';
    var notify = new NotificationTest(client, tag, oldTitle, oldBody);
    notificationList.refresh();
    assert.ok(notificationList.contains(oldTitle, oldBody),
              'unreplaced notification should exist before replacement');
    assert.ok(!notificationList.contains(newTitle, newBody),
              'replaced notification should not exists before replacement');

    var newNotify = new NotificationTest(client, tag, newTitle, newBody);
    notificationList.refresh();
    assert.ok(!notificationList.contains(oldTitle, oldBody),
              'unreplaced notification should not exist after replacement');
    assert.ok(notificationList.contains(newTitle, newBody),
              'replaced notification should exists after replacement');
  });

  test('close notification', function() {
    var tag = 'test tag, close';
    var title = 'test title, close';
    var body = 'test body, close';
    var notify = new NotificationTest(client, tag, title, body);
    notificationList.refresh();
    assert.ok(notificationList.contains(title, body),
              'notification should be in list before calling close');
    notify.close();
    notificationList.refresh();
    assert.ok(!notificationList.contains(title, body),
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
