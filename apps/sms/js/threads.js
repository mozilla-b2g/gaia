/*global Drafts */

(function(exports) {
  'use strict';

  var threads = new Map();
  var messages = new Map();
  var rthread = /\bthread=(.+)$/;
  var currentId, lastId;

  function cacheId() {
    var matches = rthread.exec(window.location.hash);
    currentId = (matches && matches.length) ? +(matches[1].trim()) : null;

    if (currentId !== null && currentId !== lastId) {
      lastId = currentId;
    }
    return currentId;
  }

  function Thread(thread) {
    var length = Thread.FIELDS.length;
    var key;

    for (var i = 0; i < length; i++) {
      key = Thread.FIELDS[i];
      this[key] = thread[key];
    }

    this.messages = [];
    this.lastMessageTimestamp = typeof this.timestamp !== 'undefined' ?
      +this.timestamp : 0;
  }

  Thread.FIELDS = [
    'body', 'id',
    'lastMessageSubject', 'lastMessageType', 'lastMessageTimestamp',
    'participants', 'timestamp', 'unreadCount'
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
      unreadCount: (options && !options.read) ? 1 : 0,
      lastMessageType: record.type || 'sms'
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
      unreadCount: (options && !options.read) ? 1 : 0,
      lastMessageType: record.type || 'sms'
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
    unregisterMessage: function(id) {
      var message = messages.get(id);
      var thread, threadMessages, index, timestamp;

      if (!message) {
        return false;
      }

      thread = Threads.get(message.threadId);
      threadMessages = thread.messages;
      index = threadMessages.indexOf(message);

      if (index === -1) {
        return false;
      }

      // There is one `message` object, but there are two strongly
      // held references to that object the must be severed:

      // 1. Splice the message from the thread object's instance cache
      threadMessages.splice(index, 1);

      // 2. Clean up the remaining message object reference from the registry
      messages.delete(id);

      // 3. Update the thread's lastMessageTimestamp to the
      // modified list's last message.timestamp
      // (Don't bother updating if the last message was deleted,
      // ThreadUI.deleteUIMessages will call Threads.delete())
      if (threadMessages.length) {
        timestamp = threadMessages[threadMessages.length - 1].timestamp;
        thread.lastMessageTimestamp = +timestamp;
      }

      return true;
    },
    registerMessage: function(message) {
      var proxy = Thread.create(message);
      var threadId = message.threadId;
      var thread, timestamp;

      if (!this.has(threadId)) {
        this.set(threadId, proxy);
      }

      // Get the actual Thread object, which is _not_
      // the same as the proxy used above.
      thread = this.get(threadId);

      // Since we're registering all existing
      // messages for a given thread when they
      // are requested via MessageManager.getMessages,
      // we need to prevent subsequent duplicate
      // registrations that will inevitably occur
      // every time a conversation is entered.
      if (messages.has(message.id)) {
        return false;
      }

      thread.messages.push(message);
      thread.messages.sort(function(a, b) {
        return +a.timestamp > +b.timestamp;
      });

      timestamp = +thread.messages[thread.messages.length - 1].timestamp;

      if (thread.lastMessageTimestamp < timestamp) {
        thread.lastMessageTimestamp = timestamp;
      }

      // Add the newly registered message's id to
      // the known message id -> message map.
      messages.set(message.id, message);

      return true;
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

      if (thread && thread.hasDrafts) {
        Drafts.delete({
          threadId: id
        });
      }

      if (thread && thread.messages) {
        thread.messages.forEach(function(message) {
          messages.delete(message.id);
        }, this);
      }

      return threads.delete(id);
    },
    clear: function() {
      threads = new Map();
      messages = new Map();
    },
    forEach: function(callback) {
      threads.forEach(function(v, k) {
        callback(v, k);
      });
    },
    get size() {
      // support: gecko 18 - size might be a function
      if (typeof threads.size === 'function') {
        return +threads.size();
      }
      return +threads.size;
    },
    get currentId() {

      if (window.location.hash.startsWith('#thread=')) {
        if (!currentId) {
          currentId = cacheId();
        }
      } else {
        currentId = null;
      }

      return currentId;
    },
    get lastId() {
      return lastId;
    },
    get active() {
      return threads.get(+Threads.currentId);
    }
  };

  exports.Thread = Thread;

  window.addEventListener('hashchange', cacheId);
}(this));
