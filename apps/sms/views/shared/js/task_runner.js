/* global Promise */
'use strict';

function TaskRunner() {
  this._currentTask = Promise.resolve();
}

TaskRunner.prototype.push = function(task) {
  var resultPromise = this._currentTask.then(task);
  this._currentTask = resultPromise.then(() => {}, () => {});
  return resultPromise;
};

TaskRunner.prototype.flush = function() { return this._currentTask; };
