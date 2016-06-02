/* global Promise */
'use strict';

function TaskRunner() {
  this._currentTask = Promise.resolve();
}

TaskRunner.prototype.push = function(task) {
  return (this._currentTask = this._currentTask.then(task, task));
};
