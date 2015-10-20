/*global TaskRunner
*/

/*exported StartupManager */
(function(exports) {
'use strict';

const priv = {
  taskQueue: Symbol('taskQueue')
};


var StartupManager = {
  init(task) {
    this[priv.taskQueue] = new TaskRunner();
    this[priv.taskQueue].push(task);
  },

  push(task) {
    this[priv.taskQueue].push(task);
  }
};

exports.StartupManager = StartupManager;

})(self);