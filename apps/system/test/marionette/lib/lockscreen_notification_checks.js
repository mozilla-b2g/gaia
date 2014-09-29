'use strict';

(function(module) {
  var LockScreenNotificationChecks = function() {
    this.Ensure = require('./ensure.js');
    this.Selector = require('./lockscreen_notification_selector.js');
    this.assert = require('assert');
    this.inverseMode = false;
    this.selector = {
      // should use it in the frame
      notifications: '#notifications-lockscreen-container .notification'
    };
    // XXX: when it becomes an app, should has its own app info class.
    this.lockScreenFrameOrigin = 'app://lockscreen.gaiamobile.org';
  };

  LockScreenNotificationChecks.prototype.start =
  function (client) {
    this.client = client;
    return this;
  };

  LockScreenNotificationChecks.prototype.ensure =
  function (condition, name) {
    var ensure = (new this.Ensure()).start(this.client);
    return ensure;
  };

  LockScreenNotificationChecks.prototype.not = function() {
    this.inverseMode = true;
    return this;
  };

  LockScreenNotificationChecks.prototype.query =
  function () {
    var selector = (new this.Selector()).start(this.client).fetch();
    return selector;
  };

  LockScreenNotificationChecks.prototype.contains = function(details) {
    // Since in LockScreen, notification may wait a time to remove the
    // notification, especially when there is a actionable one.
    var expected = this.inverseMode ? false : true;
    this.client.waitFor((function() {
      return this.query().contains(details) === expected;
    }).bind(this));
    return this;
  };

  module.exports = LockScreenNotificationChecks;
})(module);
