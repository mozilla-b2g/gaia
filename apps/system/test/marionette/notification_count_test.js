'use strict';

var assert = require('assert'),
    NotificationTest = require('./lib/notification').NotificationTest,
    NotificationList = require('./lib/notification').NotificationList,
    System = require('./lib/system');

marionette('notification count tests', function() {
  var client = marionette.client({
    settings: {
      'ftu.manifestURL': null,
      'lockscreen.enabled': false
    }
  });
  var notificationList = new NotificationList(client);
  var system = new System(client);

  test('notifications count should be updated', function(done) {
    client.switchToFrame();

    assert.ok(notificationList.waitForNotificationCount(0));

    // create a notification
    var notification = new NotificationTest(client, {
      tag: '123',
      title: 'test',
      body: 'test'
    });
    assert.ok(notification);
    assert.ok(notificationList.waitForNotificationCount(1));
    system.sendSystemUpdateNotification();
    assert.ok(notificationList.waitForNotificationCount(2));
    done();
  });
});

