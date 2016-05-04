/* global App,
          ConversationClient,
          Drafts,
          InboxView,
          InterInstanceEventDispatcher,
          LazyLoader,
          MessageManager,
          Navigation,
          Settings,
          TimeHeaders,
          Utils
*/

(function(exports) {
  'use strict';

  const LAZY_DEPENDENCIES = [
    '/shared/js/option_menu.js',
    '/views/shared/js/waiting_screen.js',
    '/views/shared/js/dialog.js',
    '/views/shared/js/error_dialog.js',
    '/views/shared/js/activity_picker.js'
  ];

  function initLazyDependencies() {
    return LazyLoader.load(LAZY_DEPENDENCIES).then(() => {
      TimeHeaders.init();
      Settings.init();

      Navigation.setReady();

      InterInstanceEventDispatcher.connect();
    });
  }

  exports.Startup = {
    init() {
      Utils.initializeShimHost(App.instanceId);

      ConversationClient.init(App.instanceId);
      MessageManager.init();
      Navigation.init();
      Drafts.init();
      InboxView.init();

      InboxView.once('visually-loaded', () => {
        initLazyDependencies();
      });

      InboxView.once('fully-loaded', () => {
        App.setReady();
      });

      InboxView.renderThreads();
    }
  };
})(window);
