'use strict';

/* global Promise */

(function(exports) {

var AbortablePromiseQueueError = function(currentId, expectedId) {
  this.currentId = currentId;
  this.expectedId = expectedId;
};
AbortablePromiseQueueError.prototype.name = 'AbortablePromiseQueueError';
AbortablePromiseQueueError.prototype.message =
  'The current task group ID does not match.';

var AbortablePromiseQueue = function AbortablePromiseQueue() {
  this._started = false;

  // task group ID is an incremental ID that will abort the steps for us
  // if there is a new scheduled tasks.
  this._taskGroupId = 0;

  // A promise queue.
  this._queuedTasks = null;
};

AbortablePromiseQueue.prototype.start = function() {
  if (this._started) {
    throw new Error('AbortablePromiseQueue: Should not be start()\'ed twice.');
  }
  this._started = true;

  this._queuedTasks = Promise.resolve();
};

AbortablePromiseQueue.prototype.stop = function() {
  if (!this._started) {
    throw new Error('AbortablePromiseQueue: ' +
      'Was not start()\'ed but stop() is called.');
  }
  this._started = false;

  this.abort();

  this._queuedTasks = null;
  this._taskGroupId = 0;
};

// Run a task group by passing an array containing the tasks.
// A task is a function to be put into the promise chain as onResolved callback
// in .then() function.
AbortablePromiseQueue.prototype.run = function(tasks) {
  // Always abort the previous scheduled task group first.
  this.abort();

  // Get the idCheck function of this task group.
  var idCheck = this._getIdCheckFunction();

  // For each task, we'll check if we really need to run it with idCheck,
  // and run it with then. If the idCheck rejects, the task will not
  // run and we will fall into catch() function at the end.
  tasks.forEach(function(task) {
    this._queuedTasks = this._queuedTasks.then(idCheck).then(task);
  }, this);

  // ... make sure error is not silently ignored and the queue is always
  // set to a resolved promise.
  this._queuedTasks = this._queuedTasks
    .catch(function(e) {
      // Don't print out AbortablePromiseQueueError, which is normal operation.
      if (e instanceof AbortablePromiseQueueError) {
        return;
      }

      // Only print out non-undefined errors.
      (e !== undefined) && console.error(e);
    });

  // Return the promise so external scripts can tell the finish time of the
  // queue, but it's not recommend to use this promise directly anywhere
  // other than test script.
  return this._queuedTasks;
};

AbortablePromiseQueue.prototype.abort = function() {
  // Advancing the taskGroupId cause the previous generated
  // idCheck function to reject when it's being run.
  this._taskGroupId++;
};

AbortablePromiseQueue.prototype._getIdCheckFunction = function() {
  var id = this._taskGroupId;

  // This function should be run in between of all functions we want to run
  // in the promise chain. It will return a reject promise if the id is not
  // match, so we can cancel everything queued afterwards.
  return function __taskGroupIdCheck(value) {
    if (id !== this._taskGroupId) {
      return Promise.reject(
        new AbortablePromiseQueueError(this._taskGroupId, id));
    }
    return value;
  }.bind(this);
};

exports.AbortablePromiseQueue = AbortablePromiseQueue;

})(window);
