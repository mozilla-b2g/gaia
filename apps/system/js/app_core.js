/* global BaseModule, LazyLoader */
'use strict';

(function() {
  // Responsible to load and init the sub system for mozApps.
  var AppCore = function(core) {
    this.core = core;
  };
  AppCore.IMPORTS = [
    'js/value_selector/value_picker.js',
    'js/value_selector/spin_date_picker.js',
    'js/value_selector/value_selector.js',
    'js/search_window.js',
    'js/value_selector/trusted_ui_value_selector.js',
    'js/browser_context_menu.js',
    'js/child_window_factory.js',
    'js/audio_channel_controller.js',
    'js/app_modal_dialog.js',
    'js/app_chrome.js',
    'js/attention_toaster.js',
    'js/app_statusbar.js',
    'js/app_transition_controller.js',
    'js/app_authentication_dialog.js',
    'js/popup_window.js',
    'js/browser_mixin.js',
    'js/wrapper_factory.js',
    'js/homescreen_window.js',
    'js/global_overlay_window.js',
    'js/trusted_window.js',
    'js/touch_forwarder.js',
    'js/callscreen_window.js',
    'js/secure_window.js',
    'js/lockscreen_window.js',
    'js/input_window.js',
    'js/activity_window.js'
  ];
  AppCore.SUB_MODULES = [
    'SystemWindow',
    'AudioChannelService',
    'VisibilityManager',
    'AppWindowManager',
    'KeyboardManager',
    'Browser', // Blocked by integration tests.
    'Activities' // Blocked by integration tests.
  ];

  BaseModule.create(AppCore, {
    name: 'AppCore',
    DEBUG: false,
    _start: function() {
      return Promise.all([
        LazyLoader.load(['shared/js/iac_handler.js']),
        this.loadWhenIdle([
          'GlobalOverlayWindowManager',
          'AttentionWindowManager',
          'TrustedWindowManager',
          'SecureWindowFactory',
          'SecureWindowManager',
          'ActivityWindowManager',
          'PermissionManager',
          'Rocketbar',
          'ActivityHandler'
        ])
      ]);
    }
  });
}());
