/* global BridgeClientMixin,
          streamClient,
          Thread
*/

(function(exports) {
  'use strict';

  const debug = 0 ?
    (arg1, ...args) => console.log(`[ConversationClient] ${arg1}`, ...args):
    () => {};

  const mark = 0 ?
    (...args) => exports.performance.mark(`[ConversationClient] ${args}`):
    () => {};

  /**
   * Name of the service that is responsible for managing conversation.
   * @type {string}
   */
  const SERVICE_NAME = 'conversation-service';

  /**
   * ConversationClient is a wrapper around bridge client connected to the
   * bridge service hosted in a Shared Worker.
   * @type {Object}
   */
  var ConversationClient = {
    /**
     * Initialized conversation service client bridge.
     * @param {string} appInstanceId Unique identifier of app instance where
     * client resides in.
     */
    init(appInstanceId) {
      // We use window based ConversationService initially, so let's init it.
      exports.ConversationService.init();

      this.initClient({
        appInstanceId: appInstanceId,
        endpoint: exports,
        plugins: [streamClient]
      });
    },

    /**
     * Upgrades current client to use Shared Worker based service, once upgrade
     * is completed service, window based service is destroyed.
     */
    upgrade() {
      return this.upgradeClient({
        endpoint: new SharedWorker(
          'services/js/conversation/conversation_service.js'
        ),
        plugins: [streamClient]
      }).then(() => {
        exports.ConversationService.destroy();
        delete exports.ConversationService;
      });
    },

    /**
     * Retrieves all conversations and drafts.
     * @param {Function} onConversationRetrieved Callback that is called for
     * every retrieved conversation.
     * @returns {Promise} Promise is resolved once all conversations are
     * retrieved and rejected if conversation stream is closed unexpectedly.
     */
    getAllConversations(onConversationRetrieved) {
      mark('start retrieving conversations');

      var getAllConversationsStream = this.clientStream('getAllConversations');

      var index = 0;
      getAllConversationsStream.listen((thread) => {
        mark(++index, ' conversation retrieved');
        debug('Conversation with id %s is retrieved from stream', thread.id);

        onConversationRetrieved(new Thread(thread));
      });

      return getAllConversationsStream.closed.then(
        () => mark('all conversations retrieved')
      ).catch((e) => {
        console.error('Conversation stream is closed unexpectedly', e);
        throw e;
      });
    }
  };

  exports.ConversationClient = Object.seal(
    BridgeClientMixin.mixin(ConversationClient, SERVICE_NAME)
  );
})(window);
