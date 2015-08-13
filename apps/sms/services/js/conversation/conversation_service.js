/*global bridge,
         BridgeServiceMixin,
         BroadcastChannel,
         Draft,
         Drafts,
         streamClient
*/
'use strict';

/**
 * Type description for the ConversationSummary object that is return from the
 * Conversation service.
 * @typedef {Object} ConversationSummary
 * @property {number} id Unique identifier of the the conversation.
 * @property {string} body Short content of the last message in the
 * conversation.
 * @property {Array.<string>} participants List of the conversation
 * participants.
 * @property {Date} timestamp Conversation timestamp.
 * @property {{ hasUnread: boolean, hasNewError: boolean }} status Conversation
 * status that indicates whether conversation has unread messages or/and failed
 * messages that user hasn't seen yet.
 * @property {string} lastMessageType Type of the last message in the
 * conversation. Can be either 'sms' or 'mms'.
 * @property {Draft} draft If conversation is draft or has draft, then this
 * field contains appropriate draft information, otherwise it's null.
 */

[
  ['bridge', '/lib/bridge/bridge.js'],
  ['streamClient', '/lib/bridge/plugins/stream/client.js'],
  ['BridgeServiceMixin', '/services/js/bridge_service_mixin.js'],
  ['Drafts', '/services/js/drafts.js']
].forEach(([dependencyName, dependencyPath]) => {
  if (!(dependencyName in self)) {
    importScripts(dependencyPath);
  }
});

(function(exports) {
  const debug = 0 ?
    (arg1, ...args) => console.log(`[ConversationService] ${arg1}`, ...args):
    () => {};

  // We use @-directive to override marker context that is scoped by
  // SharedWorker lifetime by default, but we need it to be aligned with the
  // main app context.
  const mark = 0 ?
    (...args) => exports.performance.mark(
      `[ConversationService] ${args}@sms.gaiamobile.org`
    ):
    () => {};

  const priv = {
    mobileMessageClients: Symbol('mobileMessageClients'),

    getMobileMessageClient: Symbol('getMobileMessageClient')
  };

  const SERVICE_CONTRACT = Object.freeze({
    name: 'conversation-service',

    streams: Object.freeze(
      ['getAllConversations', 'getMessagesForConversation']
    ),

    methods: Object.freeze([
      'deleteConversations', 'deleteMessages', 'markConversationsAs',
      'getConversationSummary', 'getMessage', 'findConversationFromAddress'
    ]),

    events: Object.freeze(['message-change'])
  });

  function draftToConversationSummary(draft) {
    var body = Array.isArray(draft.content) ?
      draft.content.find((content) => typeof content === 'string') : '';

    return {
      id: +draft.id,
      participants: Array.isArray(draft.recipients) ? draft.recipients : [],
      body: body,
      timestamp: new Date(draft.timestamp),
      status: { hasUnread: false, hasNewError: false },
      lastMessageType: draft.type || 'sms',
      draft: new Draft(draft)
    };
  }

  function threadToConversationSummary(thread) {
    return {
      id: thread.id,
      participants: thread.participants,
      body: thread.body,
      timestamp: thread.timestamp,
      status: { hasUnread: thread.unreadCount > 0, hasNewError: false },
      lastMessageType: thread.lastMessageType,
      draft: Drafts.byThreadId(thread.id)
    };
  }

  var ConversationService = {
    /**
     * List of mobileMessageClients mapped to specific application id.
     * @type {Map.<string, Client>}
     */
    [priv.mobileMessageClients]: null,

    /**
     * Initializes our service using the Service mixin's initService.
     */
    init() {
      this.initService();

      this[priv.mobileMessageClients] = new Map();
    },

    /**
     * Stream that returns everything needed to display conversations in the
     * inbox view.
     * @param {ServiceStream.<ConversationSummary>} serviceStream The stream to
     * use in the implementation: it will be passed automatically by the Bridge
     * library.
     * @param {appInstanceId} appInstanceId Unique id of the app instance
     * requesting service.
     */
    getAllConversations(serviceStream, appInstanceId) {
      mark('start retrieving conversations');

      var getThreadsStream = this[priv.getMobileMessageClient](
        appInstanceId
      ).stream('getThreads');

      // If conversation stream is cancelled we should cancel internal threads
      // stream as well.
      serviceStream.cancel = (reason) => {
        debug('getAllConversations stream is cancelled: %s', reason);
        return getThreadsStream.cancel(reason);
      };

      var draftsPromise = Drafts.request().then(() => {
        // Return draft list that is sorted by timestamp in inverse order.
        return Drafts.getAllThreadless().sort(
          (draftA, draftB) => draftB.timestamp - draftA.timestamp
        );
      });

      // Assume that we get the data in an inverse sort order.
      var index = 0;
      getThreadsStream.listen((thread) => {
        mark(++index, ' conversation retrieved');
        debug('Retrieved conversation with id %s', thread.id);

        draftsPromise.then((drafts) => {
          // Flush drafts that are created earlier than current thread.
          while(drafts.length && drafts[0].timestamp >= thread.timestamp) {
            serviceStream.write(draftToConversationSummary(drafts.shift()));
          }

          serviceStream.write(threadToConversationSummary(thread));
        });
      });

      return getThreadsStream.closed.then(() => draftsPromise).then(
      (drafts) => {
        for(var draft of drafts) {
          serviceStream.write(draftToConversationSummary(draft));
        }

        mark('All conversations retrieved');

        serviceStream.close();
      }).catch((e) => {
        // Pass error object once the following issue is fixed:
        // https://github.com/gaia-components/threads/issues/74
        serviceStream.abort(`[${e.name}] ${e.message || ''}`);
      });
    },

    /**
     * Stream that returns messages in a conversation, with all suitable
     * information to display in the conversation view.
     * @param {ServiceStream.<MessageSummary>} The stream to use in the
     * implementation: it will be passed automatically by the Bridge library.
     * @param {Number} conversationId Conversation to retrieve.
     */
    getMessagesForConversation(stream, conversationId) {},

    /**
     * Returns all information related to a single conversation, to display in
     * the conversation view.
     * @param {Number} conversationId Conversation to retrieve.
     * @returns {ConversationSummary}
     */
    getConversationSummary(conversationId) {},

    /**
     * Deletes one or several conversations, including their messages.
     * @param {Array.<Number>} conversationIds ID of the conversations to be
     * deleted.
     */
    deleteConversations(conversationIds) {},

    /**
     * Deletes one or several messages.
     * @param {Array.<Number>} messageIds ID of the messages to be deleted.
     */
    deleteMessages(messageIds) {},

    /**
     * Marks a conversation as read or unread.
     * @param {Object} param
     * @param {Array.<Number>} param.conversations Conversation IDs to be
     * marked.
     * @param {Boolean} param.asRead Specifies whether we mark as read of
     * unread.
     */
    markConversationsAs({conversations, asRead}) {},

    /**
     * Fetches a message information.
     * @param {Number} messageId The message ID to retrieve.
     * @returns {Message} All message information, including contact, delivery,
     * read reports, size, timestamps, etc.
     */
    getMessage(messageId) {},

    /**
     * Finds a conversation from an address (that is: a phone number or an
     * email).
     * @param {String} address This is either a phone number or an email, to
     * match an existing conversation from.
     * @returns {Number?} The id of the conversation, or null if not found.
     */
    findConversationFromAddress(address) {},

    /**
     * Returns client that serves to specified app instance, client is created
     * if it's requested for the first time.
     * @param {string} appInstanceId Unique identified of the app instance.
     */
    [priv.getMobileMessageClient](appInstanceId) {
      var mobileMessageClient = this[priv.mobileMessageClients].get(
        appInstanceId
      );

      if (!mobileMessageClient) {
        mobileMessageClient = bridge.client({
          service: 'moz-mobile-message-shim',
          endpoint: new BroadcastChannel(
            'moz-mobile-message-shim-channel-' + appInstanceId
          )
        }).plugin(streamClient);

        this[priv.mobileMessageClients].set(appInstanceId, mobileMessageClient);

        debug(
          'Create MobileMessageClient for app instance %s', appInstanceId
        );
      }

      return mobileMessageClient;
    }
  };

  exports.ConversationService = Object.seal(
    BridgeServiceMixin.mixin(
      ConversationService, SERVICE_CONTRACT.name, SERVICE_CONTRACT
    )
  );

  // Automatically init service if it's run inside worker.
  if (!self.document) {
    ConversationService.init();
  }
})(self);
