/* global ConversationView,
          Information,
          InterInstanceEventDispatcher,
          LazyLoader,
          LocalizationHelper,
          MessageManager,
          Navigation,
          Settings,
          Threads,
          TimeHeaders,
          Utils
*/

(function(exports) {
  'use strict';

  const LAZY_DEPENDENCIES = [
    '/shared/js/settings_listener.js',
    '/shared/js/mime_mapper.js',
    '/shared/js/option_menu.js',
    '/shared/js/mobile_operator.js',
    '/shared/elements/gaia_sim_picker/script.js',
    '/views/shared/js/waiting_screen.js',
    '/views/shared/js/errors.js',
    '/views/shared/js/dialog.js',
    '/views/shared/js/error_dialog.js',
    '/views/conversation/js/link_action_handler.js',
    '/views/shared/js/contact_renderer.js',
    '/views/shared/js/activity_picker.js',
    '/views/conversation/js/information.js',
    '/views/shared/js/localization_helper.js'
  ];

  function initLazyDependencies() {
    return LazyLoader.load(LAZY_DEPENDENCIES).then(() => {
      LocalizationHelper.init();
      TimeHeaders.init();
      Information.initDefaultViews();
      Settings.init();
      Navigation.setReady();

      InterInstanceEventDispatcher.connect();
    });
  }

  function initShims() {
    exports.InboxView = Object.freeze({
      markReadUnread: () => {},
      updateThread: () => {}
    });

    var deferred = Utils.Promise.defer();

    MessageManager.getThreads({
      each: (thread) => Threads.set(thread.id, thread),
      done: deferred.resolve
    });

    return deferred.promise;
  }

  exports.Startup = {
    init() {
      MessageManager.init();
      ConversationView.init();
      if (Navigation.isDefaultPanel()) {
        ConversationView.once('visually-loaded', initLazyDependencies);
      } else {
        initLazyDependencies();
      }

      // Note that we won't be able to access report and group views directly
      // because information.js is not loaded before ConversationView finishes
      // loading.
      initShims().then(() => Navigation.init());
    }
  };
})(window);
