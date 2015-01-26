define(function() {
  'use strict';

  return function() {
    var TaskScheduler = {
      _isLocked: false,
      _tasks: [],
      _lock: function() {
        this._isLocked = true;
      },
      _unlock: function() {
        this._isLocked = false;
        this._executeNextTask();
      },
      _removeRedundantTasks: function(type) {
        return this._tasks.filter(function(task) {
          return task.type !== type;
        });
      },
      _executeNextTask: function() {
        if (this._isLocked) {
          return;
        }
        var nextTask = this._tasks.shift();
        if (nextTask) {
          this._lock();
          nextTask.func(function() {
            this._unlock();
          }.bind(this));
        }
      },
      enqueue: function(type, func) {
        this._tasks = this._removeRedundantTasks(type);
        this._tasks.push({
          type: type,
          func: func
        });
        this._executeNextTask();
      }
    };

    return TaskScheduler;
  };
});
