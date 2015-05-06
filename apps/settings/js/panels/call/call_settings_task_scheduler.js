/**
 * This is the wrapper of TaskScheduler for Call Settings use.
 *
 * @module call/call_settings_task_scheduler
 */
define(function(require) {
  'use strict';

  var Module = require('modules/base/module');
  var TaskScheduler = require('modules/base/task_scheduler');

  /**
   * @class CallSettingsTaskScheduler
   * @returns {CallSettingsTaskScheduler}
   */
  var CallSettingsTaskScheduler =
    Module.create(function CallSettingsTaskScheduler() {
      this.super(TaskScheduler).call(this);
    }).extend(TaskScheduler);

  const TASK_TYPE = {
    GENERAL: 0,
    CALL_FORWARDING: 1,
    CALL_WAITING: 2,
    CALLER_ID_PREF: 3
  };

  /**
   * @memberOf CallSettingsTaskScheduler
   * @static
   */
  Object.defineProperty(CallSettingsTaskScheduler, 'TASK_TYPE', {
    enumerable: true,
    configurable: false,
    get: function() {
      return TASK_TYPE;
    }
  });

  /**
   * We will let pre-defined task_type pass here and then pass it
   * to TaskScheduler.
   *
   * @param {Object} task
   * @param {String} task.type
   * @param {Function} task.func
   * @memberOf CallSettingsTaskScheduler
   * @return {Promise}
   */
  CallSettingsTaskScheduler.prototype.enqueue = function(task) {
    var {type, func} = task;
    if (!CallSettingsTaskScheduler.TASK_TYPE[type]) {
      this.throw('You are enqueuing an unknown type - ', type,
        'please check again');
    } else {
      return TaskScheduler.prototype.enqueue.call(this, {
        type: type,
        func: func,
        cancelable: (type !== 'GENERAL')
      });
    }
  };

  return CallSettingsTaskScheduler();
});
