/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*global ActivityHandler, ThreadUI, ThreadListUI, MessageManager,
         Settings, LazyLoader, TimeHeaders, Information, SilentSms,
         PerformanceTestingHelper, App, Navigation, EventDispatcher,
         LocalizationHelper,
         InterInstanceEventDispatcher
*/

var Startup = {
  _lazyLoadScripts: [
    '/shared/js/settings_listener.js',
    '/shared/js/mime_mapper.js',
    '/shared/js/notification_helper.js',
    '/shared/js/option_menu.js',
    '/shared/js/gesture_detector.js',
    '/shared/js/settings_url.js',
    '/shared/js/mobile_operator.js',
    '/shared/js/multi_sim_action_button.js',
    '/shared/js/image_utils.js',
    '/shared/elements/gaia_sim_picker/script.js',
    'js/waiting_screen.js',
    'js/errors.js',
    'js/dialog.js',
    'js/error_dialog.js',
    'js/link_helper.js',
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
    'js/subject_composer.js',
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

      InterInstanceEventDispatcher.connect();

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

  init: function() {
    var loaded = function() {
      window.removeEventListener('DOMContentLoaded', loaded);
      window.dispatchEvent(new CustomEvent('moz-chrome-dom-loaded'));

      MessageManager.init();
      Navigation.init();
      ThreadListUI.init();
      ThreadListUI.renderThreads(this._lazyLoadInit.bind(this), function() {
        window.dispatchEvent(new CustomEvent('moz-app-loaded'));
        App.setReady();
      });

      // dispatch chrome-interactive when thread list related modules
      // initialized
      window.dispatchEvent(new CustomEvent('moz-chrome-interactive'));
    }.bind(this);

    window.addEventListener('DOMContentLoaded', loaded);
  }
};

EventDispatcher.mixin(Startup).init();
