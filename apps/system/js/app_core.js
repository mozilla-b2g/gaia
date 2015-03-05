/* global BaseModule, applications, InputWindowManager, KeyboardManager,
          LazyLoader */
'use strict';

(function() {
  // Responsible to load and init the sub system for mozApps.
  var AppCore = function(core) {
    this.core = core;
  };
  AppCore.IMPORTS = [
  ];
  AppCore.SIDE_MODULES = [
    'Activities',
    'AttentionWindowManager',
    'TrustedWindowManager',
    'SecureWindowFactory',
    'SecureWindowManager',
    'ActivityWindowManager',
    'PermissionManager',
    'Rocketbar'
  ];
  AppCore.SUB_MODULES = [
    'VisibilityManager',
    'AppWindowManager',
    'LockScreenWindowManager'
  ];
  AppCore.EVENTS = [
    'applicationready'
  ];

  BaseModule.create(AppCore, {
    name: 'AppCore',
    START_SUB_MODULES_ON_START: false,
    _handle_applicationready: function() {
      if (window.inputWindowManager) {
        return;
      }
      this._startSubModules();
    },
    _start: function() {
      if (applications.ready) {
        this._startSubModules();

        if (window.inputWindowManager) {
          return;
        }
        window.inputWindowManager = new InputWindowManager();
        window.inputWindowManager.start();
        /** @global */
        KeyboardManager.init();
      }

      window.performance.mark('appCoreStart');

      var self = this;
      var idleObserver = {
        time: 10,
        onidle: function() {
          navigator.removeIdleObserver(idleObserver);
          self._startSideModules();
          if (!window.IACHandler) {
            LazyLoader.load(['shared/js/iac_handler.js']);
          }
        }
      };
      navigator.addIdleObserver(idleObserver);
    }
  });
}());
