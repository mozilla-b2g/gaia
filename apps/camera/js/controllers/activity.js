define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('controller:activity');
var bytesToPixels = require('lib/bytes-to-pixels');
var resizeImageAndSave = require('lib/resize-image-and-save');
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
  bindAll(this);
  this.app = app;
  this.win = app.win;
  this.settings = app.settings;
  this.configure();
  this.bindEvents();
  debug('initialized');
}

/**
 * Supported activity types.
 *
 * @type {Object}
 */
ActivityController.prototype.types = {
  pick: 'pick',
  record: 'record'
};

/**
 * Initial configuration.
 *
 * @private
 */
ActivityController.prototype.configure = function() {
  this.name = this.getName();
  this.app.activity[this.name] = true;
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
  this.app.on('activitycanceled', this.onActivityCanceled);
  this.app.on('confirm:selected', this.onActivityConfirmed);

  // If an activity name was found, we must bind
  // the listener straight away so we don't miss
  // the event, otherwise we can bind more lazily.
  if (this.name) { this.setupListener(); }
  else { this.app.once('criticalpathdone', this.setupListener); }
};

ActivityController.prototype.setupListener = function() {
  debug('setup listener');
  navigator.mozSetMessageHandler('activity', this.onMessage);
  debug('listener setup');
};

/**
 * Get activity name from the hash fragment.
 *
 * This is used only so that some parts
 * of the app can prepare for an incoming
 * activity before the message arrives.
 *
 * @private
 */
ActivityController.prototype.getName = function() {
  var hash = this.win.location.hash;
  var name = hash && hash.substr(1);
  return this.types[name];
};

/**
 * Responds to incoming activity message.
 *
 * Configures the mode then emits an
 * event so that other parts of
 * the app can update accordingly.
 *
 * @param  {MozActivity} activity
 */
ActivityController.prototype.onMessage = function(activity) {
  debug('incoming activity', activity);
  var name = activity.source.name;
  var supported = this.types[name];

  // Exit if this activity isn't supported
  if (!supported) { return; }

  var data = {
    name: name,
    maxPixelSize: this.getMaxPixelSize(activity),
    maxFileSizeBytes: activity.source.data.maxFileSizeBytes
  };

  this.activity = activity;
  this.configureMode(activity);
  this.app.emit('activity', data);
  this.app.emit('activity:' + name, data);
};

/**
 * Configures the mode setting based
 * on the parameters supplied by
 * the incoming activity.
 *
 * @param  {MozActivity} activity
 * @private
 */
ActivityController.prototype.configureMode = function(activity) {
  var type = activity.source.data.type;
  var name = activity.source.name;
  var modes = (name === 'pick') ?
    this.getModesForPick(type) :
    this.getModesForRecord(type);

  this.settings.mode.filterOptions(modes);
  this.settings.mode.select(modes[0]);
  debug('configured mode', modes);
};

/**
 * Get a max pixel size estimate based
 * on the parameters supplied by the
 * incoming activity.
 *
 * Activities don't always supply pixel
 * size restrictions.
 *
 * NOTE: There
 *
 * @param  {MozActivity} activity
 * @return {Number|null}
 */
ActivityController.prototype.getMaxPixelSize = function(activity) {
  var data = activity.source.data;
  var bytes = data.maxFileSizeBytes;
  var maxPickPixelSize = this.settings.activity.get('maxPickPixelSize') || 0;
  var maxPixelSize;

  // If bytes were specified then derive
  // a maxPixelSize from that, else we
  // calculate the maxPixelSize using
  // supplied dimensions.
  if (bytes) {
    maxPixelSize = bytesToPixels(bytes);
  } else if (data.width || data.height) {
    maxPixelSize = this.getMaxPixelsFromSize(data);
  } else {
    maxPixelSize = maxPickPixelSize;
  }

  // If the Camera app has been configured to have a max pixel size
  // for pick activities, ensure we are at or below that value.
  if (maxPickPixelSize > 0) {
    maxPixelSize = Math.min(maxPixelSize, maxPickPixelSize);
  }

  debug('maxPixelsSize: %s', maxPixelSize);
  return maxPixelSize;
};

ActivityController.prototype.getMaxPixelsFromSize = function(size) {
  var scale = this.settings.activity.get('maxPixelSizeScaleFactor');
  var aspect = 4 / 3;

  // In the event that only one dimension has
  // been supplied, calculate the largest the
  // other edge could be based on a 4:3 aspect.
  var width = size.width || size.height * aspect;
  var height = size.height || size.width * aspect;
  var pixels = width * height;

  // Take the actual total number of
  // pixels asked for and bump it by the
  // `scale` to cover pictureSizes above
  // the pixels asked for. We later resize
  // the image post-capture to the exact size
  // requested (data.width * data.height).
  //
  // This is to avoid us picking a pictureSize
  // smaller than the number of pixels requested
  // and then to scaling up post-capture,
  // resulting in a shitty image.
  return pixels * scale;
};

/**
 * Parse types given by 'pick' activity
 * and return a list of modes.
 *
 * @param  {Array|String} types
 * @return {Array}
 */
ActivityController.prototype.getModesForPick = function(types) {
  types = [].concat(types || []);
  var modes = [];

  types.forEach(function(item) {
    var type = item.split('/')[0];
    var mode = type === 'image' ? 'picture' : type;

    if (modes.indexOf(mode) === -1) {
      modes.push(mode);
    }
  });

  if (modes.length === 0) {
    modes = ['picture', 'video'];
  }

  return modes;
};

/**
 * Parse types given by 'record' activity
 * and return a list of modes.
 *
 * @param  {String} type
 * @return {Array}
 */
ActivityController.prototype.getModesForRecord = function(type) {
  return type === 'videos' ?
    ['video', 'picture'] :
    ['picture', 'video'];
};

/**
 * Respond to activity cancelation
 * events and send the error call
 * via the original acitity object.
 *
 * @private
 */
ActivityController.prototype.onActivityCanceled = function() {
  if (!this.activity) { return; }
  this.activity.postError('pick cancelled');
};

// TODO: Messy, tidy up!
ActivityController.prototype.onActivityConfirmed = function(newMedia) {
  var self = this;
  var activity = this.activity;
  var needsResizing;
  var media = {
    blob: newMedia.blob
  };

  // In low end devices resizing can be slow.
  // We display a spinner
  this.app.showSpinner();

  // Video
  if (newMedia.isVideo) {
    media.type = 'video/3gpp';
    media.poster = newMedia.poster.blob;
  }

  // Image
  else {
    media.type = 'image/jpeg';
    needsResizing = activity.source.data.width || activity.source.data.height;
    debug('needs resizing: %s', needsResizing);

    if (needsResizing) {
      resizeImageAndSave({
        blob: newMedia.blob,
        width: activity.source.data.width,
        height: activity.source.data.height
      }, onImageResized);
      return;
    }
  }

  function onImageResized(resizedBlob) {
    media.blob = resizedBlob;
    activity.postResult(media);
    self.app.clearSpinner();
  }

  activity.postResult(media);
  this.app.clearSpinner();

};

});
