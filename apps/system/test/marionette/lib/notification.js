'use strict';
var util = require('util'),
    Marionette = require('marionette-client');

function NotificationTest(client, tag, title, body,
                          dir, lang, delay_create) {
  this.client = client;
  this.actions = new Marionette.Actions(client);
  this.tag = tag;
  this.title = title;
  this.body = body;
  this.dir = dir;
  this.lang = lang;
  this.client.executeScript(function() {
    if (window.wrappedJSObject.persistNotify === undefined) {
      window.wrappedJSObject.persistNotify = [];
    }
  });
  if (delay_create !== true) {
    this.create();
  }

}

NotificationTest.prototype = {
  client: null,
  tag: null,
  close: function() {
    this.client.executeScript(function(notifyTag) {
      window.wrappedJSObject.persistNotify[notifyTag].close();
    }, [this.tag]);
  },
  dumpContainer: function() {
    this.client.executeScript(function() {
      dump(
        document.getElementById('desktop-notifications-container').innerHTML);
    });
  },
  create: function() {
    this.client.executeScript(function(notifyTag, notifyTitle, notifyBody,
                                       notifyDir, notifyLang) {
      var details = { tag: notifyTag,
                      body: notifyBody};
      if (notifyDir) {
        details.dir = notifyDir;
      }
      if (notifyLang) {
        details.lang = notifyLang;
      }

      window.wrappedJSObject.persistNotify[notifyTag] =
        new Notification(notifyTitle, details);
    }, [this.tag, this.title, this.body, this.dir, this.lang]);
  }
};

function NotificationList(client) {
  this.client = client;
  this.selectors = NotificationList.Selector;
  this.notifications = null;
  this.lockScreenNotifications = null;
}

NotificationList.Selector = Object.freeze((function() {
  var listSelector = '#desktop-notifications-container';
  var itemsSelector = listSelector + ' > div';

  var lockScreenSelector = '#notifications-lockscreen-container';
  var lockScreenItemsSelector = lockScreenSelector + ' > div';

  return {
    items: itemsSelector,
    lockScreenItems: lockScreenItemsSelector
  };
})());

NotificationList.prototype = {

  _remoteGetNotificationDetails: function(selector) {
    var nodes = document.querySelectorAll(selector);
    var details = [];
    for (var node, i = 0; node = nodes[i]; i++) {
      var id = node.getAttribute('data-notification-id');
      var query = selector + '[data-notification-id="' + id + '"]';
      details.push({
        title: document.querySelector(query + ' > div').innerHTML,
        body: document.querySelector(query + ' > .detail').innerHTML,
        manifestURL: node.getAttribute('data-manifest-u-r-l')
      });
    }
    return details;
  },

  // fetch the list of open notifications from system tray
  refresh: function() {
    this.notifications = this.client.executeScript(
      this._remoteGetNotificationDetails,
      [this.selectors.items]);
  },

  // fetch the list of open notifications from the lockscreen.
  refreshLockScreen: function() {
    this.lockScreenNotifications = this.client.executeScript(
      this._remoteGetNotificationDetails,
      [this.selectors.lockScreenItems]);
  },

  // return a list of notifications for a certain app
  getForApp: function(manifestURL) {
    if (!this.notifications) {
      return [];
    }
    return this.notifications.filter(function(notification) {
      return notification.manifestURL === manifestURL;
    });
  },

  getForAppLockScreen: function(manifestURL) {
    if (!this.lockScreenNotifications) {
      return [];
    }
    return this.lockScreenNotifications.filter(function(notification) {
      return notification.manifestURL === manifestURL;
    });
  },

  // get a count of notifications with a certain title and body from the system
  // tray.
  getCount: function(title, body, manifestURL) {
    var list;
    if (manifestURL) {
      list = this.getForApp(manifestURL);
    } else {
      list = this.notifications;
    }
    var count = 0;
    for (var i = 0; i < list.length; i++) {
      var notification = list[i];
      if (notification.title === title && notification.body === body) {
        ++count;
      }
    }
    return count;
  },

  // get a count of notifications with a certain title and body from the
  // lockscreen.
  getCountLockScreen: function(title, body, manifestURL) {
    var list;
    if (manifestURL) {
      list = this.getForAppLockScreen(manifestURL);
    } else {
      list = this.lockScreenNotifications;
    }
    var count = 0;
    for (var i = 0; i < list.length; i++) {
      var notification = list[i];
      if (notification.title === title && notification.body === body) {
        ++count;
      }
    }
    return count;
  },

  // make sure we have an item with given title and body from the system tray.
  contains: function(title, body, manifestURL) {
    return this.getCount(title, body, manifestURL) > 0;
  },

  // make sure we have an item with given title and body from the lockscreen.
  containsLockScreen: function(title, body, manifestURL) {
    return this.getCountLockScreen(title, body, manifestURL);
  }
};

module.exports = {
  NotificationTest: NotificationTest,
  NotificationList: NotificationList
};
