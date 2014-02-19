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

/**
 * Initialize new `AcitivityController`
 *
 * @param {App} app
 */
function ActivityController(app) {
  if (app.activity.active) {
    bindAll(this);
    this.activity = app.activity;
    this.settings = app.settings;
    this.app = app;
    this.configure();
    this.bindEvents();
  }
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
  var maxFileSize = this.activity.data.maxFileSizeBytes;
  var setting = this.settings.pictureSizes;
  var data = this.activity.data;

  if (maxFileSize) {
    options = filterBytesLessThan(3000000, options);
    setting.set('options', options);
  } else if (data.width || data.height) {
    options = [pickBySize(options, data)];
    debug('picked picture size ', JSON.stringify(options));
    setting.set('options', options);
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

/**
 * Utils
 */

function filterBytesLessThan(bytes, sizes) {
  return sizes.filter(function(option) {
    var size = option.value;
    var mp = size.width * size.height;
    return mp <= bytes;
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
