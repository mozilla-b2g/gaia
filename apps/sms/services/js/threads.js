/*global Drafts */

(function(exports) {
  'use strict';

  var threads = new Map();
  var messageMap = new Map();

  function extractSupportedFields(
    { id, body, timestamp, participants, lastMessageType, status, isDraft }
  ) {
    return {
      id,
      body,
      timestamp,
      participants,
      lastMessageType,
      status,
      isDraft: !!isDraft
    };
  }

  function Thread(thread) {
    this.messages = new Map();

    Object.assign(this, extractSupportedFields(thread));
  }

  Thread.prototype.getDraft = function() {
    return this.isDraft ?
      Drafts.byDraftId(this.id) : Drafts.byThreadId(this.id);
  };

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
      status: { hasUnread: options && options.unread, hasNewError: false },
      lastMessageType: record.type || 'sms',
      lastMessageSubject: record.subject,
      isDraft: false
    });
  };

  Thread.fromDraft = function(draft, options) {
    var body = Array.isArray(draft.content) ?
      draft.content.find((content) => typeof content === 'string') : '';

    return new Thread({
      id: draft.threadId || draft.id,
      participants: Array.isArray(draft.recipients) ? draft.recipients : [],
      body: body,
      timestamp: new Date(draft.timestamp),
      status: { hasUnread: options && options.unread, hasNewError: false },
      lastMessageType: draft.type || 'sms',
      lastMessageSubject: draft.subject,
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
      var oldThread = threads.get(+id);

      if (oldThread) {
        Object.assign(oldThread, extractSupportedFields(thread));
      } else {
        threads.set(+id, new Thread(thread));
      }

      return threads;
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
