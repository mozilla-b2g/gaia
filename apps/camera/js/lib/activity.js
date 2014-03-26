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
  this.active = false;
  this.data = {};
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
    setTimeout(done);
    return;
  }

  debug('incoming...');
  navigator.mozSetMessageHandler('activity', onActivity);

  function onActivity(activity) {
    var data = self.parse(activity);

    // We currently only alter the
    // behaviour of the camera app
    // for 'pick' activities.
    if (data.name !== 'pick') {
      debug('type \'%s\'not supported', data.name);
      done();
      return;
    }

    self.active = true;
    self.data = data;
    self.raw = activity;
    debug('parsed \'%s\' activity', data.name, JSON.stringify(data));
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
  data.name = activity.source.name;
  data.modes = this.getModes(activity);
  debug('parsed', data);
  return data;
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
  Activity.call(this);
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
Activity.prototype.getModes = function(activity) {
  var raw = activity.source.data.type || ['image/*', 'video/*'];
  var modes = [];
  var map = {
    video: 'video',
    image: 'picture'
  };

  if (raw === 'videos') {
    return [map.video];
  }

  // Make sure it's an array
  raw = [].concat(raw);
  raw.forEach(function(item) {
    var type = item.split('/')[0];
    if (map[type]) { modes.push(map[type]); }
  });

  return modes;
};

});
