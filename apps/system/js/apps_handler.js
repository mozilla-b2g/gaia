/* global Applications, System, BaseModule */
'use strict';

(function(exports) {
  var AppsHandler = function(API) {
    // We start the applications here because it's important enough
    // to start earlier.
    window.applications = new Applications(API);
    window.applications.start();
  };
  AppsHandler.prototype = Object.create(BaseModule.prototype);
  AppsHandler.prototype.constructor = AppsHandler;
  AppsHandler.SUB_MODULE_PARENT = window;

  AppsHandler.SUB_MODULES = [
    'FtuLauncher',
    'SecureWindowFactory',
    'SecureWindowManager',
    'LockscreenWindowManager',
    'HomescreenLauncher',
    'TaskManager',
    'Rocketbar',
    'AppWindowFactory',
    'ActivityWindowManager',
    'SuspendingAppPriorityManager',
    'SystemDialogManager',
    'TextSelectionDialog',
    'AppWindowManager',
    'Activities',
    'AppUsageMetrics',
    'DialerAgent',
    'UpdateManager'
  ];

  // We have no places to specify the dependencies
  // unless we have the real module loader.
  // Since this is the keypoints of the whole window management system,
  // lets import them before the whole handler starts.
  AppsHandler.IMPORTS = [
    'js/browser_mixin.js',
    'js/browser_frame.js',
    'js/browser_config_helper.js',
    'js/app_window.js'
  ];

  var proto = {
    name: 'AppsHandler',

    __start: function() {
      this.debug('Starting');
      if (System && System.applicationReady) {
        this.startSubModules();
      } else {
        window.addEventListener('applicationready', this);
      }
      this.debug('Started');
    },

    _stop: function() {
      this.debug('Stopping');
      window.removeEventListener('applicationready', this);
      this.debug('Stopped');
    },

    _handle_applicationready: function() {
      this.startSubModules();
    }
  };
  BaseModule.mixin(AppsHandler.prototype, proto);
  exports.AppsHandler = AppsHandler;
}(window));
