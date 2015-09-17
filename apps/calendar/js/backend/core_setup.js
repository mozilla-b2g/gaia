define(function(require, exports, module) {
'use strict';

var CaldavManager = require('caldav/manager');
var Db = require('db');
var core = require('core');
var threads = require('ext/threads');

module.exports = function() {
  core.caldavManager = new CaldavManager();
  core.db = new Db('b2g-calendar');
  core.providerFactory = require('provider/factory');
  core.service = threads.service('calendar');
  core.storeFactory = require('store/factory');
  core.syncService = require('services/sync');
  core.timeModel = require('time_model');
};

});
