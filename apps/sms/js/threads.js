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

  Thread.fromDraft = function(record, options) {
    var participants = record.recipients && record.recipients.length ?
      record.recipients : [''];

    var body = record.content && record.content.length ?
      record.content.find(function(content) {
        if (typeof content === 'string') {
          return true;
        }
      }) : '';

    return new Thread({
      id: record.threadId || record.id,
      participants: participants,
      body: body,
      timestamp: new Date(record.timestamp),
      unreadCount: (options && options.unread) ? 1 : 0,
      lastMessageType: record.type || 'sms',
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

  Thread.prototype = {
    constructor: Thread,
    get drafts() {
      return Drafts.byThreadId(this.id);
    },
    get hasDrafts() {
      return !!this.drafts.length;
    }
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

      if (thread && (thread.hasDrafts || thread.isDraft)) {
        var draft = thread.isDraft ?
          Drafts.get(id) :
          { threadId: id };

        Drafts.delete(draft);
        Drafts.store();
      }
      return threads.delete(id);
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
    },
    currentId: null,
    get active() {
      return threads.get(+Threads.currentId);
    }
  };

  exports.Thread = Thread;
}(this));
