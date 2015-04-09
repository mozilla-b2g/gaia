/* global dump */
/* jshint nonew: false */
'use strict';

var Marionette = require('marionette-client');

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
  Selectors: {
    toaster: '#notification-toaster'
  },
  client: null,
  tag: null,
  close: function() {
    var ret;
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
}

NotificationList.Selector = Object.freeze((function() {
  var listSelector = '#desktop-notifications-container';
  var itemsSelector = listSelector + ' .notification';
  var countSelector = '#notification-some';

  return {
    items: itemsSelector,
    notificationsCount: countSelector
  };
})());

NotificationList.prototype = {

  _remoteGetNotificationDetails: function(selector) {
    var nodes = document.querySelectorAll(selector);
    var details = [];
    /* jshint -W084 */
    for (var node, i = 0; node = nodes[i]; i++) {
      var id = node.getAttribute('data-notification-id');
      var query = selector + '[data-notification-id="' + id + '"]';
      details.push({
        title: document.querySelector(query + ' > .title-container .title')
          .innerHTML,
        body: document.querySelector(query + ' > .detail').innerHTML,
        lang: document.querySelector(query).getAttribute('lang'),
        dir: document.querySelector(query).getAttribute('data-predefined-dir'),
        manifestURL: node.getAttribute('data-manifest-u-r-l'),
        query: query
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

  // return a list of notifications for a certain app
  getForApp: function(manifestURL) {
    if (!this.notifications) {
      return [];
    }
    return this.notifications.filter(function(notification) {
      return notification.manifestURL === manifestURL;
    });
  },

  // get a count of notifications with a certain title and body
  getCount: function(details) {
    var list;
    if (details.manifestURL) {
      list = this.getForApp(details.manifestURL);
    } else {
      list = this.notifications;
    }
    var count = 0;
    for (var i = 0; list && i < list.length; i++) {
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
      if (details.dir && notification.dir !== details.dir) {
        continue;
      }
      ++count;
    }
    return count;
  },

  // perform a tap action on the notification list
  tap: function(notificationDetails) {
    this.client.helper.waitForElement(notificationDetails.query).tap(1, 1);
  },

  // make sure we have an item with given title and body
  contains: function(details, shouldNot) {
    this.client.waitFor((function() {
      var count = this.getCount(details);
      if (shouldNot) {
        return 0 === count;
      } else {
        return 0 < count;
      }
    }).bind(this));
    return true;
  },

  waitForNotificationCount: function(expected) {
    var count;
    this.client.waitFor(function() {
      count = this.client.executeScript(
        this._getNotificationsCountText,
        [this.selectors.notificationsCount]);
      return expected === count;
    }.bind(this));
    return true;
  },

  _getNotificationsCountText: function(selector) {
    var element = document.querySelector(selector);
    var args = JSON.parse(element.dataset.l10nArgs);
    return parseInt(args.n);
  }
};

module.exports = {
  NotificationTest: NotificationTest,
  NotificationList: NotificationList
};
