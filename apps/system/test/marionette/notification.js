'use strict';
var util = require('util');

function NotificationTest(client, origin, tag) {
  this.client = client;
  this.origin = origin;
  this.tag = tag;
}

module.exports = NotificationTest;

NotificationTest.Selector = Object.freeze({
  containerElement: '[data-notification-id="%s#tag:%s"]',
  titleElement: '[data-notification-id="%s#tag:%s"] > div',
  bodyElement: '[data-notification-id="%s#tag:%s"] > .detail'
});

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
  createNotification: function(notifyTitle, notifyBody) {
    this.client.executeScript(function(notifyTag, notifyTitle, notifyBody) {
      new Notification(notifyTitle, { body: notifyBody, tag: notifyTag });
    }, [this.tag, notifyTitle, notifyBody]);
  }
};
