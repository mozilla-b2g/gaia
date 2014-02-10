define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:activity');
var bindAll = require('lib/bind-all');

/**
 * Exports
 */

module.exports = function(app) { return new ActivityController(app); };
module.exports.ActivityController = ActivityController;

function ActivityController(app) {
  bindAll(this);
  this.activity = app.activity;
  this.settings = app.settings;
  this.app = app;
  this.configure();
  this.bindEvents();
}

ActivityController.prototype.configure = function() {
  if (!this.activity.active) { return; }
  var values = this.activity.data.modes;
  this.settings.mode.configureOptions(values);
};

ActivityController.prototype.bindEvents = function() {
  this.app.on('settings:beforeconfigured', this.configureMediaSizes);
};

ActivityController.prototype.configureMediaSizes = function() {
  debug('configure media sizes');
  var activity = this.app.activity;
  if (activity.active) {
    this.configurePictureSize(activity.data);
    this.configureVideoSize(activity.data);
  }
};

ActivityController.prototype.configurePictureSize = function(data) {
  var setting = this.app.settings.pictureSizes;
  var maxFileSize = data.maxFileSizeBytes;
  var options = setting.get('options');

  if (maxFileSize) {
    options = getPictureSizesSmallerThan(options, maxFileSize);
    setting.configureOptions(options);
    return;
  }

  if (data.width || data.height) {
    options = [pickBySize(options, data)];
    debug('picked picture size ', JSON.stringify(options));
    setting.configureOptions(options);
  }
};

ActivityController.prototype.configureVideoSize = function(data) {
  var setting = this.app.settings.recorderProfiles;
  var maxFileSize = data.maxFileSizeBytes;
  var options = setting.get('options');

  if (maxFileSize) {
    options = [getLowResVideoSize(options)];
    setting.configureOptions(options);
  }
};

function getPictureSizesSmallerThan(options, bytes) {
  return options.filter(function(option) {
    var size = option.value;
    var mp = size.width * size.height;
    return mp < bytes;
  });
}

function pickBySize(options, target) {
  debug('picking closest picture size');

  var width = target.width || 0;
  var height = target.height || 0;

  return options.reduce(function(result, option) {
    var resultSize = result && result.value;
    var size = option.value;

    var largerThanTarget =
      size.width >= width &&
      size.height >= height;

    // If we don't yet have a result and this option
    // is larger than the target dimensions, use it.
    if (!result) { return largerThanTarget ? option : null; }

    // If it's not larger than the target,
    // this option isn't going to be appropriate.
    if (!largerThanTarget) { return result; }

    var smallerThanCurrent =
      size.width <= resultSize.width &&
      size.height <= resultSize.height;

    // If the option is larger than the target, yet
    // smaller is size than the current choice use it!
    return smallerThanCurrent ? option : result;
  }, null);
}

function getLowResVideoSize(options) {
  var hash = {};
  options.forEach(function(option) { hash[option.key] = option; });
  return hash.qcif || hash.cif;
}

});
