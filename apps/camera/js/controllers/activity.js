define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var lessThanBytes = require('lib/picture-sizes/less-than-bytes');
var closestToSize = require('lib/picture-sizes/closest-to-size');
var debug = require('debug')('controller:activity');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = function(app) { return new ActivityController(app); };
module.exports.ActivityController = ActivityController;

/**
 * Initialize new `ActivityController`
 *
 * @param {App} app
 */
function ActivityController(app) {
  if (!app.activity.active) { return; }

  bindAll(this);
  this.activity = app.activity;
  this.settings = app.settings;
  this.app = app;

  // Allow these methods to be overridden
  this.closestToSize = app.closestToSize || closestToSize;
  this.lessThanBytes = app.lessThanBytes || lessThanBytes;

  this.configure();
  this.bindEvents();
}

ActivityController.prototype.configure = function() {
  this.configureMode();
};

ActivityController.prototype.configureMode = function() {
  var values = this.activity.data.modes;
  this.settings.mode.resetOptions(values);
};

ActivityController.prototype.bindEvents = function() {
  this.settings.pictureSizes.on('optionsreset', this.configurePictureSize);
  this.settings.recorderProfiles.on('optionsreset', this.configureVideoSize);
};

ActivityController.prototype.configurePictureSize = function(options) {
  var data = this.activity.data;
  var maxFileSize = data.maxFileSizeBytes;
  var setting = this.settings.pictureSizes;

  if (maxFileSize) {
    options = this.lessThanBytes(maxFileSize, options);
    setting.set('options', options);
  } else if (data.width || data.height) {
    options = [this.closestToSize(data, options)];
    setting.set('options', options);
    debug('picked picture size', options);
  }
};

ActivityController.prototype.configureVideoSize = function(options) {
  var maxFileSize = this.activity.data.maxFileSizeBytes;
  var setting = this.settings.recorderProfiles;

  if (maxFileSize) {
    options = [getLowResVideoSize(options)];
    setting.set('options', options);
  }
};

function getLowResVideoSize(options) {
  var hash = {};
  options.forEach(function(option) { hash[option.key] = option; });
  return hash.qcif || hash.cif;
}

});
