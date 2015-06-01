'use strict';

var assert = require('assert'),
    NotificationTest = require('./lib/notification').NotificationTest,
    NotificationList = require('./lib/notification').NotificationList;

marionette('notification count tests', function() {
  var client = marionette.client();
  var notificationList = new NotificationList(client);

  var system;
  setup(function() {
    system = client.loader.getAppClass('system');
  });

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

