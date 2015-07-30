/**
 * TaskScheduler helps manage tasks and ensures they are executed in
 * sequential order. When a task of a certain type is enqueued, all pending
 * tasks of the same type in the queue are removed. This avoids redundant
 * queries and improves user perceived performance.
 *
 * @module modules/base/task_scheduler
 */
define(function(require) {
  'use strict';

  var Defer = require('modules/defer');
  var Module = require('modules/base/module');
  var Observable = require('modules/mvvm/observable');

  /**
   * @class TaskScheduler
   * @returns {TaskScheduler}
   */
  var TaskScheduler = Module.create(function TaskScheduler() {
    this.super(Observable).call(this);
    this.isLocked = false;
    this._tasks = [];
  }).extend(Observable);

  Observable.defineObservableProperty(TaskScheduler.prototype, 'isLocked', {
    value: false
  });

  const TASK_TYPE = {
    GENERAL: 0
  };

  /**
   * We will keep some constants here as a static variable
   *
   * @access public
   * @memberOf TaskScheduler
   */
  Object.defineProperty(TaskScheduler, 'TASK_TYPE', {
    enumerable: true,
    configurable: false,
    get: function() {
      return TASK_TYPE;
    }
  });

  /**
   * Change the internal state to make sure we are locked.
   *
   * @access private
   * @memberOf TaskScheduler
   */
  TaskScheduler.prototype._lock = function() {
    this.isLocked = true;
  };

  /**
   * Change the internal state to unlocked and execute next task.
   *
   * @access private
   * @memberOf TaskScheduler
   */
  TaskScheduler.prototype._unlock = function() {
    this.isLocked = false;
    this._executeNextTask();
  };

  /**
   * We will remove any redundant same-type tasks and keep the remaining ones
   * including the others which are not cancelable (general use task).
   *
   * @access private
   * @memberOf TaskScheduler
   * @param {String} type
   * @return {Array} array of tasks
   */
  TaskScheduler.prototype._removeRedundantTasks = function(type) {
    return this._tasks.filter((task) => {
      if (!task.cancelable) {
        return true;
      } else {
        return task.type !== type;
      }
    });
  };

  /**
   * Execute the next task when unlocked.
   *
   * @access private
   * @returns {Promise}
   * @memberOf TaskScheduler
   */
  TaskScheduler.prototype._executeNextTask = function() {
    if (this.isLocked) {
      return;
    }
    var nextTask = this._tasks.shift();
    if (nextTask) {
      this._lock();
      return nextTask.func().then((result) => {
        nextTask.defer.resolve(result);
        this._unlock();
      }, () => {
        nextTask.defer.reject();
        this._unlock();
      });
    }
  };

  /**
   * This is the only entry point for caller, and we will enqueue all tasks
   * one by one and execute them in order.
   *
   * @access public
   * @memberOf TaskScheduler
   * @param {Object} task
   * @param {String} task.type
   * @param {Function} task.func - make sure the func would return a promise
   * @param {Boolean} task.cancelable
   * @return {Promise}
   */
  TaskScheduler.prototype.enqueue = function(task) {
    var defer = Defer();

    // if there is no func, let's directly resolve this task
    if (!task.func) {
      return Promise.resolve();
    }

    if (!task.type) {
      // copy the task and make sure we won't change the previous one
      task = Object.assign({}, task);
      task.type = TaskScheduler.TASK_TYPE.GENERAL;
    }

    task.defer = defer;
    this._tasks = this._removeRedundantTasks(task.type);
    this._tasks.push(task);
    this._executeNextTask();

    return defer.promise;
  };

  return TaskScheduler;
});
