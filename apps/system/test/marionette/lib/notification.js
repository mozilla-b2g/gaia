'use strict';
var util = require('util');

function NotificationTest(client, origin, tag, title, body) {
  this.client = client;
  this.origin = origin;
  this.tag = tag;
  this.client.executeScript(function(notifyTag, notifyTitle, notifyBody) {
    if (window.wrappedJSObject.persistNotify === undefined) {
      window.wrappedJSObject.persistNotify = [];
    }
    window.wrappedJSObject.persistNotify[notifyTag] =
      new Notification(notifyTitle, { body: notifyBody, tag: notifyTag });
  }, [this.tag, title, body]);
}

module.exports = NotificationTest;

NotificationTest.Selector = Object.freeze((function() {
  var desktopSelector = '#desktop-notifications-container > ' +
      '[data-notification-id="%s#tag:%s"]';
  return {
    containerElement: desktopSelector,
    titleElement: desktopSelector + ' > div',
    bodyElement: desktopSelector + ' > .detail'
  };
})());

NotificationTest.prototype = {
  client: null,
  origin: null,
  tag: null,
  get containerElement() {
    return this.client.findElement(
      util.format(NotificationTest.Selector.containerElement,
                  this.origin,
                  this.tag));
  },
  get titleElement() {
    return this.client.findElement(
      util.format(NotificationTest.Selector.titleElement,
                  this.origin,
                  this.tag));
  },
  get bodyElement() {
    return this.client.findElement(
      util.format(NotificationTest.Selector.bodyElement,
                  this.origin,
                  this.tag));
  },
  get bodyText() {
    return this.bodyElement.getAttribute('textContent');
  },
  get titleText() {
    return this.titleElement.getAttribute('textContent');
  },
  replace: function(title, body) {
    this.client.executeScript(function(notifyTag, notifyTitle, notifyBody) {
      window.wrappedJSObject.persistNotify[notifyTag] =
        new Notification(notifyTitle, { body: notifyBody, tag: notifyTag });
    }, [this.tag, title, body]);
  },
  close: function() {
    this.client.executeScript(function(notifyTag) {
      window.wrappedJSObject.persistNotify[notifyTag].close();
    }, [this.tag]);
  }
};
