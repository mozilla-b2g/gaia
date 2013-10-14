'use strict';
var util = require('util');

function NotificationTest(client, tag, title, body) {
  this.client = client;
  this.tag = tag;
  this.client.executeScript(function(notifyTag, notifyTitle, notifyBody) {
    if (window.wrappedJSObject.persistNotify === undefined) {
      window.wrappedJSObject.persistNotify = [];
    }
    window.wrappedJSObject.persistNotify[notifyTag] =
      new Notification(notifyTitle, { body: notifyBody, tag: notifyTag });
  }, [this.tag, title, body]);
}

NotificationTest.prototype = {
  client: null,
  tag: null,
  close: function() {
    this.client.executeScript(function(notifyTag) {
      window.wrappedJSObject.persistNotify[notifyTag].close();
    }, [this.tag]);
  }
};

function NotificationList(client) {
  this.client = client;
  this.selectors = NotificationList.Selector;
  this.notifications = null;
}

NotificationList.Selector = Object.freeze((function() {
  var listSelector = '#desktop-notifications-container';
  var itemsSelector = listSelector + ' > div';
  var containerSelector = listSelector + ' > [data-notification-id="%s"]';

  return {
    items: itemsSelector,
    titleElement: containerSelector + ' > div',
    bodyElement: containerSelector + ' > .detail',
    manifestAttribute: 'data-manifest-u-r-l'
  };
})());

NotificationList.prototype = {

  // fetch the list of open notifications from system tray
  refresh: function() {
    var elements = this.client.findElements(this.selectors.items);
    this.notifications = elements.map(function(el) {
      var notificationID = el.getAttribute('data-notification-id');
      var titleElement = util.format(this.selectors.titleElement,
                                     notificationID);
      var bodyElement = util.format(this.selectors.bodyElement,
                                    notificationID);
      return {
        title: el.client.findElement(titleElement).getAttribute('innerHTML'),
        body: el.client.findElement(bodyElement).getAttribute('innerHTML'),
        manifestURL: el.getAttribute(this.selectors.manifestAttribute)
      };
    }.bind(this));
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

  // make sure we have an item with given title and body
  contains: function(title, body, manifestURL) {
    return this.getCount(title, body, manifestURL) > 0;
  }
};

module.exports = {
  NotificationTest: NotificationTest,
  NotificationList: NotificationList
};
