/* globals Notification */
'use strict';
(function (module) {

  var LockScreenNotificationActions = function () {};

  /**
   * Start to perform actions.
   */
  LockScreenNotificationActions.prototype.start =
  function (client) {
    this.actions = client.loader.getActions();
    this.Ensure = require('./ensure.js');
    this.Selector = require('./lockscreen_notification_selector.js');
    this.LockScreen = require('./lockscreen.js');
    this.client = client;
    this.created = [];
    this.lockscreen = (new this.LockScreen()).start(client);
    this.lockscreen.relock();
    return this;
  };

  LockScreenNotificationActions.prototype.ensure =
  function (condition, name) {
    var ensure = (new this.Ensure()).start(this.client);
    return ensure;
  };

  LockScreenNotificationActions.prototype.query =
  function () {
    var selector = (new this.Selector()).start(this.client).fetch();
    return selector;
  };

  LockScreenNotificationActions.prototype.fireNotification =
  function (details) {
    var notification = this.client.executeScript(
      function (_details) {
      var details = {
        tag: _details.tag,
        body: _details.body
      };
      if (_details.dir) {
        details.dir = _details.dir;
      }
      if (_details.lang) {
        details.lang = _details.lang;
      }
      var notification = new Notification(_details.title, details);
      // XXX: Because to return DOM notification would block process.
      return JSON.parse(JSON.stringify(notification));
    }, [details]);
    this.created.push(notification);
    return this;
  };

  LockScreenNotificationActions.prototype.closeNotification =
  function (details) {
    this.query().close(details.tag);
    return this;
  };

  LockScreenNotificationActions.prototype.compareNotificationDetails =
  function (detailsA, detailsB) {
    if (detailsA.title && detailsB.title !== detailsA.title) {
      return false;
    }
    if (detailsA.body && detailsB.body !== detailsA.body) {
      return false;
    }
    if (detailsA.lang && detailsB.lang !== detailsA.lang) {
      return false;
    }
    if (detailsA.bidi && detailsB.bidi !== detailsA.bidi) {
      return false;
    }
    return true;
  };

  LockScreenNotificationActions.prototype.lockScreen = function () {
    this.lockscreen.lock();
    return this;
  };

  LockScreenNotificationActions.prototype.unlockScreen = function () {
    this.lockscreen.unlock();
    return this;
  };

  module.exports = LockScreenNotificationActions;
})(module);
