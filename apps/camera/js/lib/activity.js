define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('activity');
var model = require('vendor/model');

/**
 * Mixin `Model` methods
 */

model(Activity.prototype);

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
  this.modes = ['picture', 'video'];
  debug('initialized');
}

/**
 * Checks for a pending activity,
 * calling the given callback
 * when done.
 *
 * NOTE: The `done` callback may be called a number of times
 * over the lifespan of the app instance. When the Camera app
 * receives a `record` activity, it reuses an instance of the
 * Camera app (if one exists), therefore, this callback may
 * execute more than once.
 *
 * @param  {Function} done
 */
Activity.prototype.check = function(done) {
  var hasMessage = navigator.mozHasPendingMessage('activity');
  var self = this;

  navigator.mozSetMessageHandler('activity', onActivity);

  if (!hasMessage) {
    debug('none');
    setTimeout(done);
    return;
  }

  function onActivity(activity) {
    var source = activity.source;
    var name = source.name;
    var data = source.data;

    self.activity = activity;
    self.name = name;
    self.data = data;

    switch (name) {
      case 'pick':
        debug('Received \'pick\' activity for types: %s', data.type);
        self.active = true;
        self.modes = self.getModesForPickActivity(activity);
        self.emit('activityreceived');
        break;
      case 'record':
        debug('Received \'record\' activity for types: %s', data.type);
        self.modes = self.getModesForRecordActivity(activity);
        self.emit('activityreceived');
        break;
      default:
        debug('Received unsupported \'%s\' activity', name);
        break;
    }

    done();
  }
};

Activity.prototype.getModesForPickActivity = function(activity) {
  var source = activity.source;
  var types = source.data.type || [];
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

Activity.prototype.getModesForRecordActivity = function(activity) {
  var source = activity.source;
  var type = source.data.type;
  if (type === 'videos') {
    return ['video', 'picture'];
  }

  return ['picture', 'video'];
};

/**
 * Post data back to the app
 * which spawned the activity.
 *
 * @param  {Object} data
 *
 */
Activity.prototype.postResult = function(data) {
  if (this.activity) {
    this.activity.postResult(data);
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
  if (this.activity) {
    this.activity.postError('pick cancelled');
  }
};

});
