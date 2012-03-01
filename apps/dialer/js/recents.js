'use strict';

var Recents = {
  DBNAME: 'dialerRecents',
  STORENAME: 'dialerRecents',

  get view() {
    delete this.view;
    return this.view = document.getElementById('recents-view');
  },

  init: function re_init() {

    this._openreq = mozIndexedDB.open(this.DBNAME);

    var self = this;
    this._openreq.onsuccess = function re_dbOnSuccess() {
      self._recentsDB = self._openreq.result;
    };

    this._openreq.onerror = function re_dbOnError(e) {
      console.log('Can\'t open dialerRecents database', e);
    };

    // DB init
    this._openreq.onupgradeneeded = function() {
      var db = self._openreq.result;
      if (db.objectStoreNames.contains(self.STORENAME))
        db.deleteObjectStore(self.STORENAME);
      db.createObjectStore(self.STORENAME, { keyPath: 'date' });
    };
  },

  cleanup: function re_cleanup() {
    if (this._recentsDB)
      this._recentsDB.close();
  },

  getDatabase: function re_getDatabase(callback) {
    var self = this;
    if (!this._recentsDB) {
      this._openreq.addEventListener('success', function re_DBReady() {
        self._openreq.removeEventListener('success', re_DBReady);
        self.getDatabase(callback);
      });
      return;
    }

    callback(this._recentsDB);
  },


  add: function re_add(recentCall) {
    this.getDatabase((function(database) {
      var txn = database.transaction(this.STORENAME, IDBTransaction.READ_WRITE);
      var store = txn.objectStore(this.STORENAME);

      var setreq = store.put(recentCall);

      setreq.onsuccess = (function() {
        this.render();
      }).bind(this);

      setreq.onerror = function(e) {
        console.log('dialerRecents add failure: ', e.message, setreq.errorCode);
      };
    }).bind(this));
  },

  render: function re_render() {
    content = '';

    this.history((function(history) {
      for (var i = 0; i < history.length; i++) {
        var recent = history[i];

        content += '<div class="recent ' + recent.type +
                   '" data-number="' + recent.number + '" ' +
                   'onclick="CallHandler.call(this.dataset.number)">' +

                   profilePictureForNumber(i) +
                   '  <div class="name">' + recent.number + '</div>' +
                   '  <div class="timestamp">' + prettyDate(recent.date) +
                   '  </div>' +
                   '  <div class="type"></div>' +

                   '</div>';
      }

      this.view.innerHTML = content;
    }).bind(this));
  },

  history: function re_history(callback) {
    this.getDatabase((function(database) {
      var recents = [];

      var txn = database.transaction(this.STORENAME, IDBTransaction.READ_ONLY);
      var store = txn.objectStore(this.STORENAME);

      var cursor = store.openCursor(null, IDBCursor.PREV);
      cursor.onsuccess = function(event) {
        var item = event.target.result;
        if (item) {
          recents.push(item.value);
          item.continue();
        } else {
          callback(recents);
        }
      };

      cursor.onerror = function(event) {
        callback([]);
      };
    }).bind(this));
  }
};

window.addEventListener('load', function recentsSetup(evt) {
  window.removeEventListener('load', recentsSetup);
  Recents.init();
  Recents.render();
});

window.addEventListener('unload', function recentsCleanup(evt) {
  window.removeEventListener('unload', recentsCleanup);
  Recents.cleanup();
});
