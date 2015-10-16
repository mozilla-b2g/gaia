/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

/*global ActivityHandler,
         App,
         ConversationView,
         InboxView,
         Information,
         InterInstanceEventDispatcher,
         LazyLoader,
         LocalizationHelper,
         MessageManager,
         MessagingClient,
         MozMobileConnectionsClient,
         Navigation,
         Settings,
         SilentSms,
         SystemMessageHandler,
         TimeHeaders,
         Utils
*/

(function(exports) {
/**
  * @function
  * The debug function translates to console.log in debug mode.
  *
  * @param {String} arg1 The first value to be displayed to the console.
  * @param {...*} args The other values to be displayed to the console, or the
  * parameters to the first string.
  */
var debug = 0 ?
  (arg1, ...args) => console.log('[Startup] ' + arg1, ...args) :
  () => {};

var Startup = exports.Startup = {
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
    '/views/shared/js/waiting_screen.js',
    '/views/shared/js/errors.js',
    '/views/shared/js/dialog.js',
    '/views/shared/js/error_dialog.js',
    '/views/conversation/js/link_helper.js',
    '/views/conversation/js/link_action_handler.js',
    '/views/shared/js/contact_renderer.js',
    '/views/shared/js/activity_picker.js',
    '/views/conversation/js/information.js',
    '/views/shared/js/shared_components.js',
    '/views/shared/js/task_runner.js',
    '/views/shared/js/silent_sms.js',
    '/views/conversation/js/recipients.js',
    '/views/conversation/js/attachment.js',
    '/views/conversation/js/attachment_renderer.js',
    '/views/conversation/js/conversation.js',
    '/views/conversation/js/subject_composer.js',
    '/views/conversation/js/compose.js',
    '/views/shared/js/wbmp.js',
    '/views/shared/js/smil.js',
    '/views/shared/js/notify.js',
    '/views/shared/js/activity_handler.js',
    '/views/shared/js/system_message_handler.js',
    '/views/shared/js/localization_helper.js',
    '/lib/bridge/bridge.js',
    '/services/js/bridge_service_mixin.js',
    '/services/js/activity/activity_shim.js',
    '/services/js/activity/activity_client.js',
    '/services/js/messaging/messaging_client.js',
    '/services/js/moz_mobile_connections/moz_mobile_connections_client.js'
  ],

  _lazyLoadInit: function() {
    var lazyLoadPromise = LazyLoader.load(this._lazyLoadScripts).then(() => {
      LocalizationHelper.init();

      InterInstanceEventDispatcher.connect();

      // dispatch contentInteractive when all the modules initialized
      SilentSms.init();

      ActivityHandler.init();
      SystemMessageHandler.init();

      // Init UI Managers
      TimeHeaders.init();
      ConversationView.init();
      MessagingClient.init(App.instanceId);
      MozMobileConnectionsClient.init(App.instanceId);
      Information.initDefaultViews();

      Navigation.setReady();

      window.performance.mark('contentInteractive');

      // Fetch mmsSizeLimitation and max concat
      Settings.init();

      window.performance.mark('objectsInitEnd');
    });
    return lazyLoadPromise;
  },

  /**
  * We wait for the DOMContentLoaded event in the event sequence. After we
  * loaded the first panel of threads, we lazy load all non-critical JS files.
  * As a result, if the 'load' event was not sent yet, this will delay it even
  * more until all these non-critical JS files are loaded. This is fine.
  */
  init: function() {
    var loaded = function() {
      window.removeEventListener('DOMContentLoaded', loaded);

      window.performance.mark('navigationLoaded');

      Utils.initializeShimHost(App.instanceId);

      MessageManager.init();
      InboxView.init();
      Navigation.init();

      InboxView.once('fully-loaded', () => {
        window.performance.mark('fullyLoaded');

        App.setReady();
      });

      InboxView.once('visually-loaded', () => {
        window.performance.mark('visuallyLoaded');
      });

      // If initial panel is default one and app isn't run from notification,
      // then just navigate to it, otherwise we can delay default panel
      // initialization until we navigate to requested non-default panel.
      if (Navigation.isDefaultPanel() &&
        !navigator.mozHasPendingMessage('notification') &&
        !navigator.mozHasPendingMessage('activity')) {
        debug('Rendering threads now.');

        InboxView.once('visually-loaded', () => {
          this._lazyLoadInit();
        });

        InboxView.renderThreads();
      } else {
        debug('Not using default panel, waiting for navigated event');
        Navigation.once('navigated', () => InboxView.renderThreads());

        this._lazyLoadInit();
      }

      // dispatch navigationInteractive when thread list related modules
      // initialized
      window.performance.mark('navigationInteractive');
    }.bind(this);

    window.addEventListener('DOMContentLoaded', loaded);
  }
};

Startup.init();
})(window);
