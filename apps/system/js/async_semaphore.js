/* -*- Mode: Java; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

(function(window) {
  var AsyncSemaphore = function as_contructor() {
    if (!this instanceof AsyncSemaphore) {
      return new AsyncSemaphore();
    }
    this._init();
  };

  // Do not call '_init' and '_execute' directly from outside of AsyncSemaphore
  AsyncSemaphore.prototype = {
    _init: function as_init() {
      // Please don't modify these value directly from outside of AsyncSemaphore
      this.pendingTasks = [];
      this.semaphore = 0;
    },
    _execute: function as_execute() {
      var task,
        context;
      if (this.semaphore <= 0) {
        while (this.pendingTasks.length > 0) {
          task = this.pendingTasks.shift();
          context = task.context || this;
          if (task && task.callback && typeof task.callback === 'function') {
            task.callback.call(context, task.args);
          }
        }
      }
    },
    v: function as_v(num) {
      if (!num) {
        num = 1;
      }
      this.semaphore += num;
    },
    p: function as_p() {
      this.semaphore -= 1;
      if (this.semaphore < 0) {
        this.semaphore = 0;
      }
      this._execute();
    },
    wait: function as_wait(callback, context, args) {
      this.pendingTasks.push({
        callback: callback,
        context: context,
        args: args
      });
      this._execute();
    },
    getValue: function as_getValue() {
      return this.semaphore;
    },
    getTasksLength: function as_getTasksLength() {
      return this.pendingTasks.length;
    }
  };

  window.AsyncSemaphore = AsyncSemaphore;
}(this));
