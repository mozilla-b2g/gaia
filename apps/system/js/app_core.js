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
  AppCore.SUB_MODULES = [
    'AudioChannelService',
    'VisibilityManager',
    'AppWindowManager',
    'Browser', // Blocked by integration tests.
    'Activities' // Blocked by integration tests.
  ];
  AppCore.EVENTS = [
    'applicationready'
  ];

  BaseModule.create(AppCore, {
    name: 'AppCore',
    DEBUG: false,
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

      this.loadWhenIdle([
        'AttentionWindowManager',
        'TrustedWindowManager',
        'SecureWindowFactory',
        'SecureWindowManager',
        'ActivityWindowManager',
        'PermissionManager',
        'Rocketbar',
        'ActivityHandler'
      ]).then(function() {
        LazyLoader.load(['shared/js/iac_handler.js']);
      });
    }
  });
}());
