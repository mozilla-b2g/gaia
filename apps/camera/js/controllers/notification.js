define(function(require, exports, module) {
  /*jshint laxbreak:true*/

'use strict';

/**
 * Dependencies
 */

var bindAll = require('lib/bind-all');
var debug = require('debug')('controller:notification');
var bind = require('lib/bind');

/**
 * Local variables
 **/

var NotificationView = require('views/notification');

/**
 * Exports
 */

exports = module.exports = function(app) {
  return new NotificationController(app);
};
exports.NotificationController = NotificationController;  

/**
 * Initialize a new `LowBatteryController`
 *
 * @param {Object} options
 */

function NotificationController(app) {
  this.app = app;
  this.camera = app.camera;
  this.notification = null;
  this.timeout = null;
  this.persistent = null;
  bindAll(this);
  this.bindEvents();
  debug('initialized');
}

/**
 * Bind callbacks to required events.
 *
 */

NotificationController.prototype.bindEvents = function() {
  this.app.on('notification', this.showNotification);
};

NotificationController.prototype.showNotification = function(messageObj) {
  var self = this;
  var message = new NotificationView(messageObj);

  if (!messageObj.isPersistent) {
    this.clearNotification();
    this.timeout = window.setTimeout(function() {
      self.clearNotification(message);
    }, 3000);
    this.notification = message;
  } else {
    this.removePersistentNotification();
    this.persistent = message;
  }
  message.appendTo(document.body);
};

NotificationController.prototype.clearNotification = function() {
  if (this.timeout) {
    window.clearTimeout(this.timeout);
    this.timeout = null;
  }
  if (this.notification) {
    this.notification.destroy();
    this.notification = null; 
  }
};

NotificationController.prototype.removePersistentNotification = function() {
  if(this.persistent) {
    this.persistent.destroy();
    this.persistent = null;
  }
  this.clearNotification();
};

});