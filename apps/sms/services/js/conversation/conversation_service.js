/*global BridgeServiceMixin */
'use strict';

if (!('BridgeServiceMixin' in self)) {
  importScripts('/services/js/bridge_service_mixin.js');
}

(function(exports) {
  const SERVICE_NAME = 'conversation-service';

  const STREAMS = Object.freeze(
    ['getAllConversations', 'getMessagesForConversation']
  );

  const METHODS = Object.freeze([
    'deleteConversations', 'deleteMessages', 'markConversationsAs',
    'getConversationSummary', 'getMessage', 'findConversationFromAddress'
  ]);

  const EVENTS = Object.freeze([
    'message-change'
  ]);

  var ConversationService = {
    /**
     * Initializes our service using the Service mixin's initService.
     */
    init() {
      this.initService();
    },

    /**
     * Stream that returns everything needed to display conversations in the
     * inbox view.
     * @param {ServiceStream.<ConversationSummary>} The stream to use in the
     * implementation: it will be passed autoamtically by the Bridge library.
     */
    getAllConversations(stream) {},

    /**
     * Stream that returns messages in a conversation, with all suitable
     * information to display in the conversation view.
     * @param {ServiceStream.<MessageSummary>} The stream to use in the
     * implementation: it will be passed autoamtically by the Bridge library.
     * @param {Number} conversationId Conversation to retrieve.
     */
    getMessagesForConversation(stream, conversationId) {},

    /**
     * Returns all information related to a single conversation, to display in
     * the conversation view.
     * @param {Number} conversationId Conversation to retrieve.
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
    findConversationFromAddress(address) {}
  };

  exports.ConversationService = Object.seal(
    BridgeServiceMixin.mixin(
      ConversationService,
      SERVICE_NAME,
      { methods: METHODS, streams: STREAMS, events: EVENTS }
    )
  );
})(self);
