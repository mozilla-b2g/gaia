/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*global ActivityHandler, ThreadUI, ThreadListUI, MessageManager,
         Settings, LazyLoader, TimeHeaders, Information, SilentSms,
         PerformanceTestingHelper, App, Navigation, EventDispatcher,
         LocalizationHelper
*/

var Startup = {
  _lazyLoadScripts: [
    '/shared/js/settings_listener.js',
    '/shared/js/sim_picker.js',
    '/shared/js/mime_mapper.js',
    '/shared/js/notification_helper.js',
    '/shared/js/gesture_detector.js',
    '/shared/js/settings_url.js',
    '/shared/js/mobile_operator.js',
    '/shared/js/multi_sim_action_button.js',
    '/shared/js/font_size_utils.js',
    'js/waiting_screen.js',
    'js/errors.js',
    'js/dialog.js',
    'js/error_dialog.js',
    'js/link_helper.js',
    'js/action_menu.js',
    'js/link_action_handler.js',
    'js/contact_renderer.js',
    'js/activity_picker.js',
    'js/information.js',
    'js/shared_components.js',
    'js/task_runner.js',
    'js/silent_sms.js',
    'js/recipients.js',
    'js/attachment.js',
    'js/attachment_renderer.js',
    'js/attachment_menu.js',
    'js/thread_ui.js',
    'js/compose.js',
    'js/wbmp.js',
    'js/smil.js',
    'js/notify.js',
    'js/activity_handler.js',
    'js/localization_helper.js'
  ],

  _lazyLoadInit: function() {
    LazyLoader.load(this._lazyLoadScripts, function() {
      LocalizationHelper.init();

      // dispatch moz-content-interactive when all the modules initialized
      SilentSms.init();
      ActivityHandler.init();

      // Init UI Managers
      TimeHeaders.init();
      ThreadUI.init();
      Information.initDefaultViews();

      // Dispatch post-initialize event for continuing the pending action
      Startup.emit('post-initialize');
      window.dispatchEvent(new CustomEvent('moz-content-interactive'));

      // Fetch mmsSizeLimitation and max concat
      Settings.init();

      PerformanceTestingHelper.dispatch('objects-init-finished');
    });
  },

  _initUIApp: function() {
    Navigation.init();
    ThreadListUI.init();
    ThreadListUI.renderThreads(this._lazyLoadInit.bind(this), function() {
      window.dispatchEvent(new CustomEvent('moz-app-loaded'));
      App.setReady();
    });

    // dispatch chrome-interactive when thread list related modules
    // initialized
    window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));
  },

  init: function() {
    var initUIApp = this._initUIApp.bind(this);
    window.addEventListener('DOMContentLoaded', function() {
      window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));

      if (!navigator.mozMobileMessage) {
        var mocks = [
          'js/desktop-only/mobilemessage.js',
          'js/desktop-only/contacts.js'
        ];
        LazyLoader.load(mocks, function() {
          MessageManager.init(initUIApp);
        });
        return;
      }
      MessageManager.init(initUIApp);
    });
  }
};

EventDispatcher.mixin(Startup);
Startup.init();
