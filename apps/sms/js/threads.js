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

    var messages = [];
    var ids = [];

    this.selectAll = false;
    this.deleteAll = false;

    this.messages = [];


    function push(record) {
      if (ids.indexOf(+record.id) !== -1) {
        return messages.length;
      }

      messages.push(record);
      ids.push(+record.id);

      this.messages.length = 0;

      for (var i = 0; i < messages.length; i++) {
        this.messages[i] = messages[i];
      }
    }
    // Overwrite push with special push that
    // prevents duplicates non-duplicate push
    Object.defineProperty(this.messages, 'push', {
      value: push.bind(this)
    });

  }

  var Threads = {
    set: function(id, record) {
      var old, thread;
      id = +id;
      record = record || {};

      if (threads.has(id)) {
        // Updates the reference
        old = threads.get(id);
        for (var p in record) {
          old[p] = record[p];
        }
        return old;
      }

      thread = new Thread(record);
      threads.set(id, thread);

      return thread;
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
      return Threads.get(Threads.currentId);
    }
  };

  // Flags used for deleting the entire list
  // of threads if the user selects to do so
  Threads.List = {
    selectAll: false,
    deleteAll: false,
    deleting: [],
    tracking: {}
  };

  window.addEventListener('hashchange', cacheId);

  exports.Threads = Threads;
}(this));
