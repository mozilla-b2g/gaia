define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var bindAll = require('utils/bindAll');
var debug = require('debug')('controller:settings');
var SettingsView = require('views/settings');
var config = require('config/app');

/**
 * Locals
 */

var has = {}.hasOwnProperty;
var list = listFromConfig(config);

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
    this.app.on('settingsrequest', this.openSettings);
    this.app.on('settingsdismiss', this.closeSettings);
    this.app.on('settingstoggle', this.toggleSettings);
  },

  openSettings: function() {
    if (this.view) { return; }
    var options = { state: this.state, list: list };
    this.view = new SettingsView(options).render();
    this.view.appendTo(this.app.el);
    debug('appended menu');
  },

  closeSettings: function() {
    if (!this.view) { return; }
    this.view.destroy();
    this.view = null;
  },

  toggleSettings: function() {
    if (this.view) { this.closeSettings(); }
    else { this.openSettings(); }
  }
};

function listFromConfig(config) {
  var list = [];
  var item;

  // Compile a list of items
  // which have a 'menu' key
  for (var key in config) {
    item = config[key];
    if (has.call(item, 'menu')) {
      item.key = key;
      list.push(item);
    }
  }

  // Sort the list by menu index
  list.sort(function(a, b) { return a.menu - b.menu; });
  debug('list from config', list);
  return list;
}

});
