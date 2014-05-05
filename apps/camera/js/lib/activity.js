define(function(require, exports, module) {
'use strict';

/**
 * Dependencies
 */

var debug = require('debug')('activity');
var events = require('vendor/evt');

var supported = {
  pick: true,
  record: true
};

/**
 * Mixin event emitter
 */

events(Activity.prototype);

/**
 * Exports
 */

module.exports = Activity;

/**
 * Initialize a new `Activity`
 *
 * @constructor
 */
function Activity(options) {
  this.win = options && options.win || window; // test hook
  this.modes = ['picture', 'video'];
  this.active = false;
  this.data = {};
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
  debug('checking');

  var isPending = this.isPending();
  var self = this;

  navigator.mozSetMessageHandler('activity', onActivity);
  debug('isPending: %s', isPending);

  // When there is no pending message
  // we call the callback sync, so we
  // can complete App startup ASAP.
  if (!isPending) {
    done();
    return;
  }

  function onActivity(activity) {
    var source = activity.source;
    var name = source.name;
    var data = source.data;

    self.activity = activity;
    self.name = name;
    self.data = data;
    self.active = true;
    self[name] = true;

    switch (name) {
      case 'pick':
        debug('Received \'pick\' activity for types: %s', data.type);
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

    debug('activity parsed', self);
    done();
  }
};

Activity.prototype.isPending = function() {
  var hash = this.win.location.hash;
  var name = hash && hash.substr(1);
  return supported[name];
};

Activity.prototype.getModesForPickActivity = function(activity) {
  var source = activity.source;
  var types = [].concat(source.data.type || []);
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
  if (this.active) {
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
  if (this.active) {
    this.activity.postError('pick cancelled');
  }
};

});
