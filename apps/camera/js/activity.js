define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('activity');

/**
 * Exports
 */

module.exports = Activity;

/**
 * Initialize a new `Activity`
 *
 * @constructor
 */
function Activity() {
  this.name = null;
  this.active = false;
  this.data = {};
  this.allowedTypes = {
    image: false,
    video: false,
    both: false
  };
  debug('initialized');
}

/**
 * Checks for a pending activity,
 * calling the given callback
 * when done.
 *
 * @param  {Function} done
 */
Activity.prototype.check = function(done) {
  var hasMessage = navigator.mozHasPendingMessage('activity');
  var self = this;

  if (!hasMessage) {
    debug('none');
    done();
    return;
  }

  debug('incoming...');
  navigator.mozSetMessageHandler('activity', onActivity);

  function onActivity(activity) {
    var parsed = self.parse(activity);

    // We currently only alter the
    // behaviour of the camera app
    // for 'pick' activities.
    if (parsed.name !== 'pick') {
      debug('type \'%s\'not supported', parsed.name);
      done();
      return;
    }

    self.data = parsed;
    self.active = true;
    self.name = parsed.name;
    self.allowedTypes = parsed.types;
    self.mode = parsed.mode;
    self.raw = activity;
    debug('parsed \'%s\' activity', self);
    done();
  }
};

/**
 * Parses a raw activity object
 * and returns relevant information.
 *
 * @param  {Activity} activity
 * @return {Object}
 */
Activity.prototype.parse = function(activity) {
  var data = activity.source.data;
  var parsed = {
    name: activity.source.name,
    types: this.getTypes(activity),
    fileSize: data.maxFileSizeBytes,
    width: data.width,
    height: data.height
  };
  parsed.mode = this.modeFromTypes(parsed.types);
  debug('parsed', parsed);
  return parsed;
};

/**
 * Post data back to the app
 * which spawned the activity.
 *
 * @param  {Object} data
 *
 */
Activity.prototype.postResult = function(data) {
  if (this.raw) {
    this.raw.postResult(data);
    this.reset();
  }
};

/**
 * Cancel the activity.
 *
 * This should cause the user
 * to be navigated back to the
 * app which spawned the activity.
 *
 */
Activity.prototype.cancel = function() {
  if (this.raw) {
    this.raw.postError('pick cancelled');
    this.reset();
  }
};

/**
 * Reset the activity state.
 *
 */
Activity.prototype.reset = function() {
  this.raw = null;
  this.name = null;
  this.active = false;
};

/**
 * Returns an object that
 * states which types (image,
 * video) the incoming acitvity
 * accepts.
 *
 * @param  {Activity} activity
 * @return {Object}
 */
Activity.prototype.getTypes = function(activity) {
  var raw = activity.source.data.type || ['image/*', 'video/*'];
  var types = {};

  if (raw === 'videos') {
    types.video = true;
    return types;
  }

  // Make sure it's an array
  raw = [].concat(raw);

  raw.forEach(function(type) {
    var prefix = type.split('/')[0];
    types[prefix] = true;
  });

  return types;
};

/**
 * Returns an appropriate capture
 * mode when given a types object.
 *
 * @param  {Object} types
 * @return {String}
 */
Activity.prototype.modeFromTypes = function(types) {
  return !types.image && types.video ? 'video' : 'photo';
};

});
