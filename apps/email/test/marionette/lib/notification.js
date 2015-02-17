/*jshint node: true, browser: true */
'use strict';

var assert = require('assert'),
    containerSelector = '#desktop-notifications-container .other-notifications';

function Notification(client) {
  this.client = client;
}
module.exports = Notification;

Notification.prototype = {
  getContainer: function() {
    return this.client.findElement(containerSelector);
  },

  assertNoNotification: function() {
    this.getContainer().findElement('div', function(error) {
      assert.ok(!!error);
    });
  },

  /**
   * Uses Notification.get to get the first notification to show up. This
   * approach is used instead of something like tapping on the notification,
   * since the notification UI is normally hidden and it is non-trivial to open,
   * and the data API really reflects the result of the notification work done
   * by the email app.
   */
  triggerFirstNotification: function() {
    var client = this.client;
    return client.executeAsyncScript(function() {
      function getFirstNotification() {
        window.Notification.get().then(function(notifications) {
          if (!notifications) {
            marionetteScriptFinished(false);
          } else if (!notifications.length) {
            // The check was done too fast. Wait for some time to pass
            // and check again.
            window.setTimeout(getFirstNotification, 300);
          } else {
            var notification = notifications[0],
                evt = window.wrappedJSObject.require('evt');

            evt.emit('notification', {
              clicked: true,
              imageURL: notification.imageURL,
              data: notification.data,
              tag: notification.tag
            });

            marionetteScriptFinished(true);
          }
        }).catch(function(error) {
          console.error('Notification.get failed with: ' + error);
          marionetteScriptFinished(false);
        });
      }

      getFirstNotification();
    });
  },

  /**
   * Uses Notification.get to get the first notification's data.
   */
  getFirstNotificationData: function() {
    var client = this.client;
    return client.executeAsyncScript(function() {
      function getFirstNotification() {
        window.Notification.get().then(function(notifications) {
          if (!notifications) {
            marionetteScriptFinished(false);
          } else if (!notifications.length) {
            // The check was done too fast. Wait for some time to pass
            // and check again.
            window.setTimeout(getFirstNotification, 300);
          } else {
            var notification = notifications[0];

            marionetteScriptFinished({
              imageURL: notification.imageURL,
              data: notification.data,
              tag: notification.tag
            });
          }
        }).catch(function(error) {
          console.error('Notification.get failed with: ' + error);
          marionetteScriptFinished(false);
        });
      }

      getFirstNotification();
    });
  }
};

require('./debug')('notification', Notification.prototype);
