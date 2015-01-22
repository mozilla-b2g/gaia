/* global BaseModule, applications */
'use strict';

(function() {
  // Responsible to load and init the sub system for mozApps.
  var AppCore = function(app, core) {
    this.core = core;
    this.app = app;
  };
  AppCore.IMPORTS = [
  ];
  AppCore.SUB_MODULES = [
    'AppWindowManager',
    'AttentionWindowManager',
    'HomescreenWindowManager',
    'LockScreenWindowManager',
    'TrustedWindowManager',
    'SuspendingAppPriorityManager',
    'SecureWindowFactory',
    'SecureWindowManager',
    'ActivityWindowManager'
  ];
  AppCore.EVENTS = [
    'applicationready'
  ];

  BaseModule.create(AppCore, {
    name: 'AppCore',
    START_SUB_MODULES_ON_START: false,
    _handle_applicationready: function() {
      this._startSubModules();
    },
    _start: function() {
      if (applications.ready) {
        this._startSubModules();
      }
    }
  });
}());
