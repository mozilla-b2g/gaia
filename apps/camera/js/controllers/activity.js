define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var lessThanFileSize = require('lib/picture-sizes/less-than-file-size');
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
  debug('initializing');

  bindAll(this);
  this.activity = app.activity;
  this.settings = app.settings;
  this.app = app;

  // Allow these methods to be overridden
  this.closestToSize = app.closestToSize || closestToSize;
  this.lessThanFileSize = app.lessThanFileSize || lessThanFileSize;

  this.configure();
  this.bindEvents();
  debug('initialized');
}

/**
 * Initial configuration.
 *
 * @private
 */
ActivityController.prototype.configure = function() {
  this.configureMode();
};

/**
 * Filter down pictureSizes and
 * recorderProfiles to match activity
 * parameters each time the settings
 * are configured.
 *
 * @private
 */
ActivityController.prototype.bindEvents = function() {
  this.settings.recorderProfiles.on('configured', this.filterRecorderProfiles);
  this.settings.pictureSizes.on('configured', this.filterPictureSize);
};

/**
 * Set filter the capture mode options
 * @return {[type]} [description]
 */
ActivityController.prototype.configureMode = function() {
  var modes = this.activity.data.modes;
  this.settings.mode.filterOptions(modes);
  debug('configured mode', modes);
};

/**
 * If `maxFileSizeBytes` is specified,
 * we filter down the available picture
 * sizes to just those less than the
 * given number of bytes (estimated).
 *
 * Else, if a `width` or `height` is
 * defined by the activity, we find
 * the picture size that is closest to,
 * but still larger than, the given size.
 *
 * @private
 */
ActivityController.prototype.filterPictureSize = function() {
  var setting = this.settings.pictureSizes;
  var options = setting.get('options');
  var data = this.activity.data;
  var maxFileSize = data.maxFileSizeBytes;
  var filtered;
  var keys;

  // By file-size
  if (maxFileSize) {
    filtered = this.lessThanFileSize(maxFileSize, options);
    keys = filtered.map(function(option) { return option.key; });
    setting.filterOptions(keys);
    debug('picture sizes less than \'%s\' bytes', maxFileSize);
  }

  // By width/height
  else if (data.width || data.height) {
    filtered = this.closestToSize(data, options);
    if (filtered) { setting.filterOptions([filtered.key]); }
    debug('picked picture size', filtered);
  }
};

/**
 * If an activity has specified `maxFileSizeBytes`
 * we filter down to just the the lowest (last)
 * resolution recorder profile.
 *
 * @private
 */
ActivityController.prototype.filterRecorderProfiles = function() {
  var maxFileSize = this.activity.data.maxFileSizeBytes;
  var setting = this.settings.recorderProfiles;
  var options = setting.get('options');

  if (!maxFileSize) { return; }

  var last = options[options.length - 1];
  setting.filterOptions([last.key]);
};

});
