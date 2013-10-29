'use strict';
var util = require('util'),
    Marionette = require('marionette-client');

function NotificationTest(client, details, delay_create) {
  this.client = client;
  this.actions = new Marionette.Actions(client);
  this.tag = details.tag;
  this.title = details.title;
  this.body = details.body;
  this.dir = details.dir;
  this.lang = details.lang;
  if (delay_create !== true) {
    this.create();
  }
}

NotificationTest.prototype = {
  client: null,
  tag: null,
  close: function() {
    var ret = undefined;
    this.client.executeAsyncScript(function(notifyTag) {
      var n = Notification.get({tag: notifyTag});
      n.then(
        function(nt) {
          if (nt.length === 1) {
            nt[0].close();
            marionetteScriptFinished(true);
            return;
          }
          marionetteScriptFinished(false);
        },
        function(nt) {
          marionetteScriptFinished(false);
        });
    }, [this.tag], function(err, value) {
      ret = value;
    });
    return ret;
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
        lang: document.querySelector(query + ' > div').getAttribute('lang'),
        dir: document.querySelector(query + ' > div').getAttribute('dir'),
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

  // get a count of notifications with a certain title and body
  getCount: function(useLockscreen, details) {
    var list;
    if (useLockscreen) {
      if (details.manifestURL) {
        list = this.getForAppLockScreen(details.manifestURL);
      } else {
        list = this.lockScreenNotifications;
      }
    } else {
      if (details.manifestURL) {
        list = this.getForApp(details.manifestURL);
      } else {
        list = this.notifications;
      }
    }
    var count = 0;
    for (var i = 0; i < list.length; i++) {
      var notification = list[i];
      if (details.title && notification.title !== details.title) {
        continue;
      }
      if (details.body && notification.body !== details.body) {
        continue;
      }
      if (details.lang && notification.lang !== details.lang) {
        continue;
      }
      if (details.bidi && notification.bidi !== details.bidi) {
        continue;
      }
      ++count;
    }
    return count;
  },

  // make sure we have an item with given title and body from the lockscreen.
  containsLockScreen: function(details) {
    return this.getCount(true, details) > 0;
  },

  // make sure we have an item with given title and body
  contains: function(details) {
    return this.getCount(false, details) > 0;
  }
};

module.exports = {
  NotificationTest: NotificationTest,
  NotificationList: NotificationList
};
