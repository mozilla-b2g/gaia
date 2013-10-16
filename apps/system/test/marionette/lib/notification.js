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
          }
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

      //window.wrappedJSObject.persistNotify[notifyTag] =
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
        lang: el.client.findElement(titleElement).getAttribute('lang'),
        dir: el.client.findElement(titleElement).getAttribute('dir'),
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
  getCount: function(details) {
    var list;
    if (details.manifestURL) {
      list = this.getForApp(details.manifestURL);
    } else {
      list = this.notifications;
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

  // make sure we have an item with given title and body
  contains: function(title, body, manifestURL) {
    return this.getCount(title, body, manifestURL) > 0;
  }
};

module.exports = {
  NotificationTest: NotificationTest,
  NotificationList: NotificationList
};
