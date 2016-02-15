/* global BaseModule */
'use strict';

(function(exports) {
  // Responsible to load and init the sub system for mozApps.
  var AppCore = function(core) {
    this.core = core;
  };

  AppCore.IMPORTS = [
    'js/browser_context_menu.js',
    'js/child_window_factory.js',
    'js/audio_channel_controller.js',
    'js/app_modal_dialog.js',
    'js/app_chrome.js',
    'js/attention_toaster.js',
    'js/app_authentication_dialog.js',
    'js/popup_window.js',
    'js/browser_mixin.js',
    'js/wrapper_factory.js',
    'js/homescreen_window.js',
    'js/landing_app_window.js',
    'js/activity_window.js'
  ];

  AppCore.SUB_MODULES = [
    'SystemWindow',
    'AudioChannelService',
    'AppWindowManager'
  ];

  BaseModule.create(AppCore, {
    name: 'AppCore',
    DEBUG: false
  });
}(window));
