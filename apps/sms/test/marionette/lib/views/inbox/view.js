'use strict';

/* global module */

var InboxAccessor = require('./accessors');

function InboxView(client) {
  this.client = client;
  this.accessors = new InboxAccessor(client);
}

InboxView.prototype = {
  get conversations() {
    return this.accessors.conversations.reduce(function(list, conversation) {
      // It's workaround for the case when conversation node reference is stale,
      // so when we try to access MarionetteElement from the node that's not
      // attached to the dom we'll get an exception.
      try {
        var bodyText = conversation.findElement('.body-text');
        list.push({
          id: +conversation.getAttribute('data-thread-id'),
          lastMessageType: conversation.getAttribute('data-last-message-type'),
          title: this.accessors.getConversationTitle(conversation).text(),
          bodyText: bodyText.displayed() ? bodyText.text() : '',
          isDraft: !!conversation.getAttribute('data-draft-id'),
          hasDraft: conversation.getAttribute('class').indexOf('draft') !== -1
        });
      } catch(e) {
        console.error('Conversation node is not available', e);
      }

      return list;
    }.bind(this), []);
  },

  goToConversation: function(conversationId) {
    var conversation = this.accessors.findConversation(conversationId);

    // We should retrieve all required info from the conversation node before we
    // tap on it, as in split view mode tap triggers document to change and
    // the node will be discarded.
    var isConversationLessDraft = !!conversation.getAttribute('data-draft-id');

    conversation.tap();

    return isConversationLessDraft ?
      this._createNewMessageView() :
      this._createConversationView();
  },

  hasConversation: function(conversationId) {
    return this.accessors.hasConversation(conversationId);
  },

  createNewMessage: function() {
    this.accessors.createNewMessageButton.tap();

    return this._createNewMessageView();
  },

  _createNewMessageView: function() {
    var NewMessageView = require('../new-message/view');
    var newMessageView = new NewMessageView(this.client);
    newMessageView.accessors.waitToAppear();
    return newMessageView;
  },

  _createConversationView: function() {
    var ConversationView = require('../conversation/view');
    var conversationView = new ConversationView(this.client);
    conversationView.accessors.waitToAppear();
    return conversationView;
  }
};

module.exports = InboxView;
