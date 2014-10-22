console.time("task_runner.js");
/* global Promise */
'use strict';

function TaskRunner() {
  this._currentTask = Promise.resolve();
}

TaskRunner.prototype.push = function(task) {
  return (this._currentTask = this._currentTask.then(task, task));
};
console.timeEnd("task_runner.js");
