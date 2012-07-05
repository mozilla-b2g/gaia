'use strict';

var Recents = {
  DBNAME: 'dialerRecents',
  STORENAME: 'dialerRecents',

  get view() {
    delete this.view;
    return this.view = document.getElementById('recents-container');
  },

  init: function re_init() {
    var indexedDB = window.indexedDB || window.webkitIndexedDB ||
        window.mozIndexedDB || window.msIndexedDB;

    this._openreq = indexedDB.open(this.DBNAME);

    var self = this;
    this._openreq.onsuccess = function re_dbOnSuccess() {
      self._recentsDB = self._openreq.result;
    };

    this._openreq.onerror = function re_dbOnError(e) {
      console.log('Can\'t open dialerRecents database', e);
    };

    // DB init
    this._openreq.onupgradeneeded = function re_onUpgradeNeeded() {
      var db = self._openreq.result;
      if (db.objectStoreNames.contains(self.STORENAME))
        db.deleteObjectStore(self.STORENAME);
      db.createObjectStore(self.STORENAME, { keyPath: 'date' });
    };

    this.render();
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
    var self = this;

    this.getDatabase(function(database) {
      var txn = database.transaction(self.STORENAME, 'readwrite');
      var store = txn.objectStore(self.STORENAME);

      var setreq = store.put(recentCall);
      setreq.onsuccess = function sr_onsuccess() {
        // TODO At some point with we will be able to get the app window
        // to update the view. Relying on visibility changes until then.
        // (and doing a full re-render)
      };

      setreq.onerror = function(e) {
        console.log('dialerRecents add failure: ', e.message, setreq.errorCode);
      };
    });
  },

  click: function re_click(target) {
    var number = target.dataset.num;
    if (number) {
      CallHandler.call(number);
    }
  },

  createRecentEntry: function re_createRecentEntry(recent) {
    var classes = 'icon ';
    if (recent.type.indexOf('dialing') != -1) {
      classes += 'icon-outgoing';
    } else if (recent.type.indexOf('incoming') != -1) {
      classes += 'icon-incoming';
    } else {
      classes += 'icon-missed';
    }

    var entry =
      '<li class="log-item" data-num="' + recent.number + '">' +
      '  <section class="icon-container grid center">' +
      '    <div class="grid-cell grid-v-align">' +
      '      <div class="icon ' + classes + '"></div>' +
      '    </div>' +
      '  </section>' +
      '  <section class="log-item-info grid">' +
      '    <div class="grid-cell grid-v-align">' +
      '      <section class="primary-info ellipsis">' +
      recent.number +
      '      </section>' +
      '      <section class="secondary-info ellipsis">' +
      prettyDate(recent.date) +
      '      </section>' +
      '    </div>' +
      '  </section>' +
      '</li>';
    return entry;
  },

  render: function re_render() {
    if (!this.view)
      return;

    var self = this;
    this.history(function showRecents(recents) {
      if (recents.length == 0) {
        self.view.innerHTML = '';
        return;
      }

      var content = '';
      var currentDay = '';
      for (var i = 0; i < recents.length; i++) {
        var day = self.getDayDate(recents[i].date);
        if (day != currentDay) {
          if (currentDay != '') {
            content += '</ol></section>';
          }
          currentDay = day;

          content +=
            '<section data-timestamp="' + day + '">' +
            '  <h2>' + headerDate(day) + '</h2>' +
            '  <ol id="' + day + '" class="log-group">';
        }
        content += self.createRecentEntry(recents[i]);
      }
      self.view.innerHTML = content;

      self.updateContactDetails();
    });
  },

  updateContactDetails: function re_updateContactDetails() {
    var itemSelector = '.log-item .primary-info';
    var commLogItemPhoneNumbers = document.querySelectorAll(itemSelector);
    var length = commLogItemPhoneNumbers.length;
    for (var i = 0; i < length; i++) {
      Contacts.findByNumber(commLogItemPhoneNumbers[i].textContent.trim(),
        function re_contactCallBack(phoneNumberEl, contact) {
          if (contact && contact.name) {
            phoneNumberEl.textContent = contact.name;
          }
        }.bind(this, commLogItemPhoneNumbers[i]));
    }
  },

  getDayDate: function re_getDayDate(timestamp) {
    var date = new Date(timestamp);
    var startDate = new Date(date.getFullYear(),
                             date.getMonth(), date.getDate());
    return startDate.getTime();
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
  }

};

window.addEventListener('load', function recentsSetup(evt) {
  window.removeEventListener('load', recentsSetup);
  Recents.init();
});

window.addEventListener('unload', function recentsCleanup(evt) {
  window.removeEventListener('unload', recentsCleanup);
  Recents.cleanup();
});
