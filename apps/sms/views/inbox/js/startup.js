/* global App,
          ConversationClient,
          InboxView,
          InterInstanceEventDispatcher,
          LazyLoader,
          MessageManager,
          Navigation,
          Settings,
          TimeHeaders
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

  function initShimHost() {
    var shimHostIframe = document.querySelector('.shim-host');

    var promise = shimHostIframe.contentDocument.readyState === 'complete' ?
      Promise.resolve() :
      new Promise((resolve) => {
        shimHostIframe.addEventListener('load', function onLoad() {
          shimHostIframe.removeEventListener('load', onLoad);
          resolve();
        });
      });

    return promise.then(
      () => shimHostIframe.contentWindow.bootstrap(App.instanceId)
    );
  }

  exports.Startup = {
    init() {
      initShimHost();

      ConversationClient.init(App.instanceId);
      MessageManager.init();
      Navigation.init();
      InboxView.init();

      InboxView.once('visually-loaded', () => {
        initLazyDependencies();
      });

      InboxView.renderThreads();
    }
  };
})(window);
