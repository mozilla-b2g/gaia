
(function(exports) {
  'use strict';

  var threads = new Map();
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
    for (var p in thread) {
      this[p] = thread[p];
    }
    this.messages = [];
  }

  var Threads = exports.Threads = {
    // TODO: https://bugzilla.mozilla.org/show_bug.cgi?id=943778
    // This method fills the gap while we wait for next 'getThreads' request,
    // letting us rendering the new thread with a better performance.
    createThreadMockup: function(message, options) {
      // Given a message we create a thread as a mockup. This let us render the
      // thread without requesting Gecko, so we increase the performance and we
      // reduce Gecko requests.
      return {
        id: message.threadId,
        participants: [message.sender || message.receiver],
        body: message.body,
        timestamp: message.timestamp,
        unreadCount: (options && !options.read) ? 1 : 0,
        lastMessageType: message.type || 'sms'
      };
    },
    registerMessage: function(message) {
      var threadMockup = this.createThreadMockup(message);
      var threadId = message.threadId;
      if (!this.has(threadId)) {
        this.set(threadId, threadMockup);
      }
      this.get(threadId).messages.push(message);
    },
    set: function(id, thread) {
      var old;
      id = +id;
      if (threads.has(id)) {
        // Updates the reference
        old = threads.get(id);
        for (var p in thread) {
          old[p] = thread[p];
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
      return threads.delete(+id);
    },
    clear: function() {
      threads = new Map();
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

  window.addEventListener('hashchange', cacheId);
}(this));
