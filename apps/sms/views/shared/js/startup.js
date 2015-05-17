/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*global ActivityHandler, ConversationView, InboxView, MessageManager,
         Settings, LazyLoader, TimeHeaders, Information, SilentSms,
         App, Navigation, EventDispatcher, LocalizationHelper,
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
    'views/shared/js/waiting_screen.js',
    'views/shared/js/errors.js',
    'views/shared/js/dialog.js',
    'views/shared/js/error_dialog.js',
    'views/conversation/js/link_helper.js',
    'views/conversation/js/link_action_handler.js',
    'views/shared/js/contact_renderer.js',
    'views/shared/js/activity_picker.js',
    'views/conversation/js/information.js',
    'views/shared/js/shared_components.js',
    'views/shared/js/task_runner.js',
    'views/shared/js/silent_sms.js',
    'views/conversation/js/recipients.js',
    'views/conversation/js/attachment.js',
    'views/conversation/js/attachment_renderer.js',
    'views/conversation/js/conversation.js',
    'views/conversation/js/subject_composer.js',
    'views/conversation/js/compose.js',
    'views/shared/js/wbmp.js',
    'views/shared/js/smil.js',
    'views/shared/js/notify.js',
    'views/shared/js/activity_handler.js',
    'views/shared/js/localization_helper.js'
  ],

  _lazyLoadInit: function() {
    var lazyLoadPromise = LazyLoader.load(this._lazyLoadScripts).then(() => {
      LocalizationHelper.init();

      InterInstanceEventDispatcher.connect();

      // dispatch contentInteractive when all the modules initialized
      SilentSms.init();
      ActivityHandler.init();

      // Init UI Managers
      TimeHeaders.init();
      ConversationView.init();
      Information.initDefaultViews();

      // Dispatch post-initialize event for continuing the pending action
      Startup.emit('post-initialize');
      window.performance.mark('contentInteractive');

      // Fetch mmsSizeLimitation and max concat
      Settings.init();

      window.performance.mark('objectsInitEnd');
    });
    this._initHeaders();
    return lazyLoadPromise;
  },

  _initHeaders: function() {
    var headers = document.querySelectorAll('gaia-header[no-font-fit]');
    for (var i = 0, l = headers.length; i < l; i++) {
      headers[i].removeAttribute('no-font-fit');
    }
  },

  /**
  * We wait for the DOMContentLoaded event in the event sequence. After we
  * loaded the first panel of threads, we lazy load all non-critical JS files.
  * As a result, if the 'load' event was not sent yet, this will delay it even
  * more until all these non-critical JS files are loaded. This is fine.
  */
  init: function() {
    function initializeDefaultPanel(firstPageLoadedCallback) {
      Navigation.off('navigated', initializeDefaultPanel);

      InboxView.init();
      InboxView.renderThreads(firstPageLoadedCallback).then(() => {
        window.performance.mark('fullyLoaded');
        App.setReady();
      });
    }

    var loaded = function() {
      window.removeEventListener('DOMContentLoaded', loaded);

      window.performance.mark('navigationLoaded');

      MessageManager.init();
      Navigation.init();

      // If initial panel is default one and app isn't run from notification,
      // then just navigate to it, otherwise we can delay default panel
      // initialization until we navigate to requested non-default panel.
      if (Navigation.isDefaultPanel() &&
        !navigator.mozHasPendingMessage('notification')) {
        Navigation.toDefaultPanel();
        initializeDefaultPanel(this._lazyLoadInit.bind(this));
      } else {
        Navigation.on('navigated', initializeDefaultPanel);

        this._lazyLoadInit();
      }

      // dispatch navigationInteractive when thread list related modules
      // initialized
      window.performance.mark('navigationInteractive');
    }.bind(this);

    window.addEventListener('DOMContentLoaded', loaded);
  }
};

EventDispatcher.mixin(Startup).init();
