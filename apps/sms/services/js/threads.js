/*global Drafts */

(function(exports) {
  'use strict';

  var threads = new Map();
  var messageMap = new Map();

  function Thread(thread) {
    var length = Thread.FIELDS.length;
    var key;

    for (var i = 0; i < length; i++) {
      key = Thread.FIELDS[i];
      this[key] = thread[key];
    }

    this.messages = new Map();
  }

  Thread.prototype.getDraft = function() {
    return this.isDraft ?
      Drafts.byDraftId(this.id) : Drafts.byThreadId(this.id);
  };

  Thread.FIELDS = [
    'body', 'id', 'lastMessageSubject', 'lastMessageType',
    'participants', 'timestamp', 'unreadCount', 'isDraft'
  ];

  Thread.fromMessage = function(record, options) {
    var participants = [];

    if (typeof record.delivery !== 'undefined') {
      if (record.delivery === 'received' ||
          record.delivery === 'not-downloaded') {
        participants = [record.sender];
      } else {
        participants = record.receivers || [record.receiver];
      }
    }

    return new Thread({
      id: record.threadId,
      participants: participants,
      body: record.body,
      timestamp: record.timestamp,
      unreadCount: (options && options.unread) ? 1 : 0,
      lastMessageType: record.type || 'sms',
      isDraft: false
    });
  };

  Thread.fromDraft = function(draft, options) {
    var participants = draft.recipients && draft.recipients.length ?
      draft.recipients : [''];

    var body = draft.content && draft.content.length ?
      draft.content.find(function(content) {
        if (typeof content === 'string') {
          return true;
        }
      }) : '';

    return new Thread({
      id: draft.threadId || draft.id,
      participants: participants,
      body: body,
      timestamp: new Date(draft.timestamp),
      unreadCount: (options && options.unread) ? 1 : 0,
      lastMessageType: draft.type || 'sms',
      isDraft: true
    });
  };

  Thread.create = function(record, options) {
    if (record instanceof Thread) {
      return record;
    }
    return record.delivery ?
      Thread.fromMessage(record, options) :
      Thread.fromDraft(record, options);
  };

  var Threads = exports.Threads = {
    registerMessage: function(message) {
      var threadId = +message.threadId;
      var messageId = +message.id;

      if (!this.has(threadId)) {
        this.set(threadId, Thread.create(message));
      }
      this.get(threadId).messages.set(messageId, message);
      messageMap.set(messageId, threadId);
    },
    unregisterMessage: function(id) {
      id = +id;
      var threadId = messageMap.get(id);

      if (this.has(threadId)) {
        this.get(threadId).messages.delete(id);
      }
      messageMap.delete(id);
    },
    set: function(id, thread) {
      var old, length, key;
      id = +id;
      if (threads.has(id)) {
        // Updates the reference
        old = threads.get(id);
        length = Thread.FIELDS.length;
        for (var i = 0; i < length; i++) {
          key = Thread.FIELDS[i];
          old[key] = thread[key];
        }

        return threads;
      }
      return threads.set(id, new Thread(thread));
    },
    get: function(id) {
      return threads.get(+id);
    },
    has: function(id) {
      return threads.has(+id);
    },
    delete: function(id) {
      id = +id;

      var thread = this.get(id);

      if (!thread) {
        return;
      }

      threads.delete(id);

      var draft = thread.getDraft();
      if (draft) {
        Drafts.delete(draft).store();
      }
    },
    clear: function() {
      threads = new Map();
    },
    forEach: function(callback) {
      threads.forEach(function(v, k) {
        callback(v, k);
      });
    },
    keys: function() {
      return threads.keys();
    },
    get size() {
      // support: gecko 18 - size might be a function
      if (typeof threads.size === 'function') {
        return +threads.size();
      }
      return +threads.size;
    }
  };

  Threads.Messages = {
    get(id) {
      id = +id;
      var threadId = messageMap.get(id);

      if (Threads.has(threadId)) {
        return Threads.get(threadId).messages.get(id);
      }

      return null;
    }
  };

  exports.Thread = Thread;
}(this));
