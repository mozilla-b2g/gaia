'use strict';

var MockNotifications = [];

/**
 * This mock partly implements a Web Notification contructor, see
 * https://developer.mozilla.org/en-US/docs/Web/API/notification
 */
function MockNotification(title, options) {
  this.id = options.id || 0;
  this.title = title;
  this.icon = options.icon || undefined;
  this.body = options.body || undefined;
  this.tag = options.tag || undefined;
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
