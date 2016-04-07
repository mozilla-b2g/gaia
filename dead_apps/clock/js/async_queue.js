'use strict';
define(function(require) {

  /**
   * A serial queue of functions. Call `.push()` to add a function to
   * the task; when each function completes (as a result of calling
   * 'done()'), the next item in the queue will be executed.
   */
  function AsyncQueue() {
    this.queue = [];
    this.current = null;
  }

  AsyncQueue.prototype = {
    /**
     * Add a function to the execution queue. It should accept one
     * argument, a 'done' callback.
     */
    push: function(fn) {
      if (!this.current) {
        this._startTask(fn);
      } else {
        this.queue.push(fn);
      }
    },

    _startTask: function(fn) {
      this.current = fn;
      fn(this._nextTask.bind(this));
    },

    _nextTask: function() {
      this.current = null;
      if (this.queue.length) {
        this._startTask(this.queue.shift());
      }
    }
  };

  return AsyncQueue;
});

