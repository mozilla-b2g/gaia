/**
 * TaskScheduler helps manage tasks and ensures they are executed in
 * sequential order. When a task of a certain type is enqueued, all pending
 * tasks of the same type in the queue are removed. This avoids redundant
 * queries and improves user perceived performance.
 *
 * @module call/task_sheduler
 */
define(function() {
  'use strict';
  
  /**
   * @class TaskScheduler
   * @returns {TaskScheduler}
   */
  var TaskScheduler = function() {
    this._isLocked = false;
    this._tasks = [];
  };

  TaskScheduler.prototype = {
    /**
     * Change the internal state to make sure we are locked.
     *
     * @access private
     * @memberOf TaskScheduler
     */
    _lock: function() {
      this._isLocked = true;
    },

    /**
     * Change the internal state to unlocked and execute next task.
     *
     * @access private
     * @memberOf TaskScheduler
     */
    _unlock: function() {
      this._isLocked = false;
      this._executeNextTask();
    },

    /**
     * We will filter out redundant tasks and execute only the remaining ones.
     *
     * @access private
     * @memberOf TaskScheduler
     * @param {String} type
     */
    _removeRedundantTasks: function(type) {
      return this._tasks.filter((task) => {
        return task.type !== type;
      });
    },

    /**
     * Execute the next task when unlocked.
     *
     * @access private
     * @memberOf TaskScheduler
     */
    _executeNextTask: function() {
      if (this._isLocked) {
        return;
      }
      var nextTask = this._tasks.shift();
      if (nextTask) {
        this._lock();
        nextTask.func(() => {
          this._unlock();
        });
      }
    },

    /**
     * This is the only entry point for caller, and we will enqueue all tasks
     * one by one and execute them in order.
     *
     * @access public
     * @memberOf TaskScheduler
     * @param {String} type
     * @param {Function} func
     */
    enqueue: function(type, func) {
      this._tasks = this._removeRedundantTasks(type);
      this._tasks.push({
        type: type,
        func: func
      });
      this._executeNextTask();
    }
  };

  return function ctor_task_scheduler() {
    return new TaskScheduler();
  };
});
