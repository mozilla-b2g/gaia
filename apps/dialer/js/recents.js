'use strict';

var Recents = {
  DBNAME: 'dialerRecents',
  STORENAME: 'dialerRecents',
  _prettyDatesInterval: null,

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

    if (this.view)
      this.startUpdatingDates();
  },

  cleanup: function re_cleanup() {
    if (this._recentsDB)
      this._recentsDB.close();

    this.stopUpdatingDates();
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
      var txn = database.transaction(this.STORENAME, 'readwrite');
      var store = txn.objectStore(this.STORENAME);

      var setreq = store.put(recentCall);

      setreq.onsuccess = (function() {
        if (this.view) {
          var entry = this.createEntry(recentCall);

          var firstEntry = this.view.firstChild;
          this.view.insertBefore(entry, firstEntry);
        }
      }).bind(this);

      setreq.onerror = function(e) {
        console.log('dialerRecents add failure: ', e.message, setreq.errorCode);
      };
    }).bind(this));
  },

  createEntry: function re_createEntry(recent) {
    var innerFragment = '<img src="style/images/contact-placeholder.png"' +
                        '  alt="profile" />' +
                        '<div class="name">' +
                        '  ' + (recent.number || 'Anonymous') +
                        '</div>' +
                        '<div class="number"></div>' +
                        '<div class="timestamp" data-time="' +
                        '  ' + recent.date + '">' +
                        '  ' + prettyDate(recent.date) +
                        '</div>' +
                        '<div class="type"></div>';

    var entry = document.createElement('div');
    entry.classList.add('recent');
    entry.classList.add(recent.type);
    entry.dataset.number = recent.number;
    entry.innerHTML = innerFragment;

    if (recent.number) {
      Contacts.findByNumber(recent.number, (function(contact) {
        this.querySelector('.name').textContent = contact.name;
        this.querySelector('.number').textContent = contact.tel[0].number;
      }).bind(entry));
    }

    return entry;
  },

  render: function re_render() {
    if (!this.view)
      return;

    this.view.innerHTML = '';

    this.history((function(history) {
      for (var i = 0; i < history.length; i++) {
        var entry = this.createEntry(history[i]);
        this.view.appendChild(entry);
      }
    }).bind(this));
  },

  history: function re_history(callback) {
    this.getDatabase((function(database) {
      var recents = [];

      var txn = database.transaction(this.STORENAME, 'readonly');
      var store = txn.objectStore(this.STORENAME);

      var cursor = store.openCursor(null, 'prev');
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
  },

  showLast: function re_showLast() {
    this.view.scrollTop = 0;
  },

  startUpdatingDates: function re_startUpdatingDates() {
    if (this._prettyDatesInterval)
      return;

    var self = this;
    var updatePrettyDates = function re_updateDates() {
      var datesSelector = '.timestamp[data-time]';
      var datesElements = self.view.querySelectorAll(datesSelector);

      for (var i = 0; i < datesElements.length; i++) {
        var element = datesElements[i];
        var time = parseInt(element.dataset.time);
        element.textContent = prettyDate(time);
      }
    };

    this._prettyDatesInterval = setInterval(updatePrettyDates, 1000 * 60 * 5);
    updatePrettyDates();
  },

  stopUpdatingDates: function re_stopUpdatingDates() {
    if (this._prettyDatesInterval) {
      clearInterval(this._prettyDatesInterval);
      this._prettyDatesInterval = null;
    }
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
