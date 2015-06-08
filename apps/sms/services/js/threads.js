/*global
  Drafts,
  SmsDB
*/

(function(exports) {
  'use strict';

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
    'participants', 'timestamp', 'unreadCount', 'isDraft', 'contactDetails'
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

  Thread.prototype = {
    save: function() {
      return SmsDB.Threads.put(this);
    }
  };

  exports.Threads = {
    registerMessage: function(message) {
      var threadId = +message.threadId;

      return SmsDB.Threads.getForUpdate(threadId, (thread) => {
        if (!thread) {
          thread = Thread.fromMessage(message);
        }
        thread.messages.push(message);
        return thread;
      });
    },
    // TODO unregisterMessage
    update: function(thread) {
      return SmsDB.Threads.getForUpdate(thread.id, (existingThread) => {
        if (!existingThread) {
          return thread;
        }

        Thread.FIELDS.forEach((key) => {
          existingThread[key] = thread[key];
        });

        return existingThread;
      });
    },
    put: function(thread) {
      return SmsDB.Threads.put(new Thread(thread));
    },
    get: function(id) {
      return SmsDB.Threads.get(+id);
    },
    getSeveral: function(ids) {
      return SmsDB.Threads.getSeveral(ids);
    },
    has: function(id) {
      return SmsDB.Threads.has(+id);
    },
    delete: function(id) {
      id = +id;

      Drafts.delete({
        threadId: id
      });

      return Promise.all([
        Drafts.store(),
        SmsDB.Threads.delete(id)
      ]).then(() => {});
    },
    clear: function() {
      return SmsDB.Threads.clear();
    },
    forEach: function(callback) {
      return SmsDB.Threads.forEach(callback);
    },
    keys: function() {
      return threads.keys();
    },

    set currentId(id) {
      if (id === null) {
        this.active = null;
        this._currentId = null;
        return;
      }

      id = +id;
      this._currentId = id;
      this.active = this.get(id);
    },

    get currentId() {
      return this._currentId;
    },

    active: null
  };

  exports.Thread = Thread;
}(this));
