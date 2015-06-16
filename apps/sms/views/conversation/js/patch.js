/* global Navigation,
          MessageManager,
          Threads,
          Startup,
          Utils
*/

(function(exports) {
  'use strict';

  exports.InboxView = {
    init: () => {},
    renderThreads: () => Promise.resolve(),
    whenReady: () => Promise.resolve(),
    markReadUnread: () => {}
  };

  const DEFAULT_PANEL = 'composer';

  if (!exports.location.hash) {
    exports.location.hash = DEFAULT_PANEL;
  }

  Startup.on('post-initialize', () => {
    MessageManager.getThreads({
      each: (thread) => Threads.set(thread.id, thread),
      done: () => {
        Navigation.toPanel(
          Navigation.getPanelName() || DEFAULT_PANEL,
          Utils.params(exports.location.hash)
        );
      }
    });
  });
})(window);
