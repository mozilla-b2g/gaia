/* global Applications, System, applications */
'use strict';

(function(exports) {
  var ApplicationsMediator = function(API) {
    window.applications = new Applications(API);
    window.applications.start();
  };
  ApplicationsMediator.prototype = {
    MODULES: [
      'HomescreenLauncher',
      'FtuLauncher',
      'Rocketbar',
      'TaskManager',
      'SecureWindowFactory',
      'AppWindowFactory',
      'SecureWindowManager',
      'LockScreenWindowManager',
      'ActivityWindowManager',
      'SuspendingAppPriorityManager',
      'SystemDialogManager',
      'TextSelectionDialog',
      'AppWindowManager',
      'Activities',
      'AppUsageMetrics',
      'DialerAgent'
    ],
    start: function() {
      if (applications && applications.ready) {
        this.handleEvent(new CustomEvent('applicationready'));
      } else {
        window.addEventListener('applicationready', this);
      }
    },
    stop: function() {
      window.removeEventListener('applicationready', this);
      this.MODULES.forEach(function(module) {
        var moduleName =
            module.charAt(0).toUpperCase() + module.slice(1);
        window[moduleName] && window[moduleName].stop();
      }, this);
    },
    handleEvent: function(evt) {
      this.loadModules();
    },
    loadModules: function() {
      this.MODULES.forEach(function(module) {
        console.log(module, window[module]);
        if (typeof(window[module]) == 'function') {
          var moduleName = System.lowerCapital(module);
          window[moduleName] = new window[module](this);
          window[moduleName].start && window[moduleName].start();
        } else if (typeof(window[module]) !== 'undefined') {
          window[module].init && window[module].init();
        }
      }, this);
    }
  };
  exports.ApplicationsMediator = ApplicationsMediator;
}(window));