define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var bindAll = require('utils/bindAll');
var debug = require('debug')('controller:settings');
var SettingsView = require('views/settings');
var config = require('config/app').settings;

/**
 * Locals
 */

var list = createListFromConfig(config);

/**
 * Exports
 */

module.exports = function(app) {
  return new SettingsController(app);
};

function SettingsController(app) {
  this.state = app.state;
  this.app = app;
  bindAll(this);
  this.bindEvents();
  debug('initialized');
}

SettingsController.prototype = {
  bindEvents: function() {
    this.app.on('settingsrequest', this.onSettingsRequest);
    //this.app.on('settingsdismiss', this.onSettingsDismiss);
  },

  onSettingsRequest: function() {
    if (this.view) { return; }
    var options = { state: this.state, list: list };
    this.view = new SettingsView(options).render();
    this.view.appendTo(this.app.el);
    debug('appended menu');
  },

  onSettingsDismiss: function() {
    if (!this.view) { return; }
    this.view.destroy();
    this.view = null;
  }
};

function createListFromConfig(config) {
  var menu = config.menu;
  var keys = config.keys;
  var list = menu.map(function(key) {
    var item = keys[key];
    item.key = key;
    return item;
  });
  debug('list from config', list);
  return list;
}

});
