'use strict';

var assert = require('chai').assert;
var CellBroadcastSystem = require('./lib/cell_broadcast_system');
var Lockscreen = require('./lib/lockscreen');
var NotificationList = require('./lib/notification').NotificationList;

marionette('mozApps', function() {

  var client = marionette.client();

  var cellBroadcastSystem = new CellBroadcastSystem(client);
  var event, system;

  setup(function() {
    system = client.loader.getAppClass('system');
  });

  suite('CellBroadcastSystem', function() {
    setup(function() {
      system.waitForStartup();
      event = {
        message: {
          body: 'test'
        }
      };
    });

    test('is shown when a message arrives', function() {
      cellBroadcastSystem.show(event);
      client.waitFor(function() {
        return cellBroadcastSystem.visible;
      });
    });

    test('does not truncate a large message', function() {
      event.message.body = 'This should be a large message and ';
      event.message.body += 'is filling up some space ';
      event.message.body += '1234567abcdefghijklmnopqrstuvwxyz';
      cellBroadcastSystem.show(event);
      var msgSize = cellBroadcastSystem.dialog.findElement('p').size();
      var screenSize = system.screenSize;
      assert.ok(msgSize.width <= screenSize.width);
    });
  });

});

marionette('mozApps - lockscreen enabled', function() {

  var client = marionette.client({
    settings: {
      'lockscreen.enabled': true
    }
  });

  var cellBroadcastSystem = new CellBroadcastSystem(client);
  var notificationList = new NotificationList(client);
  var event, lockscreen, system;

  setup(function() {
    lockscreen = new Lockscreen();
    lockscreen.start(client);
    system = client.loader.getAppClass('system');
  });

  suite('CellBroadcastSystem', function() {
    setup(function() {
      system.waitForStartup();
      event = {
        message: {
          body: 'test'
        }
      };
    });

    test('is shown when a message arrives, and clear notification', function() {
      // Make sure no notification before sending cell broadcast message
      notificationList.refresh();
      assert.equal(notificationList.notifications.length, 0);

      // Send cell broadcast message and unlock lock screen
      cellBroadcastSystem.show(event);
      lockscreen.unlock();

      // Show utility tray and tap on first notification
      client.executeScript(function() {
        window.wrappedJSObject.UtilityTray.show(true);
      });
      notificationList.refresh();
      notificationList.tap(notificationList.notifications[0]);

      // Should show cell broadcast message and clear notification
      notificationList.refresh();
      var count = notificationList.notifications.length;
      client.waitFor(function() {
        return count === 0 && cellBroadcastSystem.visible;
      });
    });
  });

});
