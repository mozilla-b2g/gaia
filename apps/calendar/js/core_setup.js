define(function(require, exports, module) {
'use strict';

// load all the dependencies needed by "core" and initialize them to avoid
// circular dependencies (many modules depend on "core")

var ErrorController = require('controllers/error');
var TimeController = require('controllers/time');
var bridge = require('bridge');
var core = require('core');
var notificationsController = require('controllers/notifications');
var periodicSyncController = require('controllers/periodic_sync');
var syncListener = require('sync_listener');
var viewFactory = require('views/factory');

module.exports = function() {
  if (core.bridge) {
    return;
  }
  core.bridge = bridge;
  core.errorController = new ErrorController();
  core.notificationsController = notificationsController;
  core.periodicSyncController = periodicSyncController;
  core.syncListener = syncListener;
  core.timeController = new TimeController();
  core.viewFactory = viewFactory;
};

});
