'use strict';

var MockNotifications = [];

/**
 * This mock partly implements a Web Notification contructor, see
 * https://developer.mozilla.org/en-US/docs/Web/API/notification
 */
function MockNotification(title, options) {
  this.id = options.id || 0;
  this.title = title;
  this.icon = options.icon;
  this.body = options.body;
  this.tag = options.tag;
  this.data = options.data;
  this.mEvents = {};

  MockNotifications.push(this);
}

MockNotification.prototype.close = function() {
  // nothing to do
};

MockNotification.prototype.onshow = function() {
  // nothing to do
};

MockNotification.prototype.addEventListener =
  function mockNotification_addEventListener(evt, callback) {
  this.mEvents[evt] = callback;
};

MockNotification.prototype.removeEventListener =
  function mockNotification_removeEventListener(evt, callback) {
  delete this.mEvents[evt];
};

MockNotification.get = function mockNotification_get(options) {
  return {
    then: function() {}
  };
};

MockNotification.mTeardown = function mn_mTeardown() {
  MockNotifications = [];
};

MockNotification.requestPermission = function() {};
