'use strict';

(function(window) {
  /**
   * The module's responsibility is to actively kill
   * a suspending app window according to launch time if there're
   * too many suspending app window instances running.
   *
   * About suspending: if an app is killed by OOM killer,
   * it would remain in the task manager if 'app-suspending.enabled'
   * is turned on.
   *
   * It depends on the app stack managed by StackManager.
   *
   * @module  SuspendingAppPriorityManager
   * @requires module:StackManager
   * @requires module:System
   */
  var SuspendingAppPriorityManager = function() {};
  SuspendingAppPriorityManager.prototype.start = function() {
    window.addEventListener('appsuspended', this);
    window.addEventListener('appresumed', this);
  };

  /**
   * The current suspending app count.
   */
  SuspendingAppPriorityManager.prototype.suspendedCount = 0;
  /**
   * The maximum suspending app count we could suffer.
   * @type {Number}
   */
  SuspendingAppPriorityManager.prototype.MAXIMUM_SUSPENDED_COUNT = 10;
  SuspendingAppPriorityManager.prototype._DEBUG = false;

  SuspendingAppPriorityManager.prototype.handleEvent = function(evt) {
    switch (evt.type) {
      case 'appsuspended':
        this.suspendedCount++;
        this.debug('suspending app count increases to ' + this.suspendedCount);
        this._handleSuspendingAppCountChanged();
        break;
      case 'appresumed':
        this.suspendedCount--;
        this.debug('suspending app count decreases to ' + this.suspendedCount);
        break;
    }
  };

  /**
   * Check if the suspending app count exceeds the maximum;
   * if so, find an eldest suspending app to kill.
   */
  SuspendingAppPriorityManager.prototype.
    _handleSuspendingAppCountChanged = function() {
      if (this.suspendedCount > this.MAXIMUM_SUSPENDED_COUNT) {
        this.debug('exceed maximum suspending count, find someone to kill..');
        // XXX: Maintain our own suspending app stack.
        var stack = self.StackManager._stack;
        var current = self.StackManager._current;
        this.debug(stack.length, current);
        // Go through the stack to find the eldest app which is suspended.
        for (var i = current; i < current + stack.length; i++) {
          var index = i % stack.length;
          var candidate = stack[index];
          this.debug(index, candidate.name, candidate.suspended);
          if (candidate.suspended) {
            this.debug('killing zombie app: ' + candidate.name);
            candidate.kill();
            return;
          }
        }
      }
    };

  SuspendingAppPriorityManager.prototype.debug = function() {
    if (this._DEBUG) {
      console.log('[SuspendingAppPriorityManager]' +
        '[' + self.Service.currentTime() + '] ' +
        Array.slice(arguments).concat());
    }
  };

  window.SuspendingAppPriorityManager = SuspendingAppPriorityManager;
}(self));
