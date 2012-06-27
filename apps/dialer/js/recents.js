'use strict';

var Recents = {
  DBNAME: 'dialerRecents',
  STORENAME: 'dialerRecents',
  _prettyDatesInterval: null,

  get view() {
    delete this.view;
    return this.view = document.getElementById('contacts-container');
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

    this.render();
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

    var self = this;

    this.getDatabase(function(database) {
      var txn = database.transaction(self.STORENAME, 'readwrite');
      var store = txn.objectStore(self.STORENAME);
      var setreq = store.put(recentCall);
      setreq.onsuccess = function sr_onsuccess() {
        // TODO At some point with we will be able to get the app window
        // to update the view. Relying on vivibility changes until then.
        // (and doing a full re-render)
      };
      setreq.onerror = function(e) {
        console.log('dialerRecents add failure: ', e.message, setreq.errorCode);
      };

    });
  },
  createEntry: function re_createEntry(recent) {
    var entry = document.createElement('li');

    // Add class
    entry.classList.add('log-item');
    // Create HTML structure
    var htmlStructure = "<section class='icon-container grid center'>";
    htmlStructure += "<div class='grid-cell grid-v-align'><div class='icon ";

    // Depending on call type we add icon
    if (recent.type.indexOf('dialing') != -1) {
      htmlStructure += 'icon-outgoing';
    } else {
      if (recent.type != 'incoming') {
        htmlStructure += 'icon-incoming';
      } else {
        htmlStructure += 'icon-missed';
      }
    }

    htmlStructure += "'></div></div>";
    htmlStructure += '</section>';
    htmlStructure += "<section class='log-item-info grid'>";
    htmlStructure += "<div class='grid-cell grid-v-align'>";
    //Check if contact is in Agenda
    Contacts.findByNumber(recent.number, function findContact(contact) {
      if (contact) {
        htmlStructure += "<section class='primary-info ellipsis'>";
        htmlStructure += (contact.name || recent.number) + '</section>';
      }
    });
    htmlStructure += "<section class='primary-info ellipsis'>";
    htmlStructure += recent.number + '</section>';
    htmlStructure += "<section class='secondary-info ellipsis'>";
    htmlStructure += prettyDate(recent.date) + '</section>';
    htmlStructure += '</div>';
    htmlStructure += '</section>';

    entry.innerHTML = htmlStructure;
    return entry;
  },
  render: function re_render() {

    if (!this.view)
      return;

    var self = this;
    this.history(function(recents) {
      // Clean DOM
      self.view.innerHTML = '';
      if (recents.length > 0) {

        //Sort by date
        recents.sort(function(a,b) {
          return b.date - a.date;
        });
        console.log("Sort ended");
        // Update token
        self.currentToken = recents[0].date;
        for (var i = 0; i < recents.length; i++) {

          // We retrieve temp token
          var token_tmp = self.getDayDate(recents[i].date);
          // Compare tokens
          if (token_tmp < self.currentToken) {
            // Update token
            self.currentToken = token_tmp;
            // Create structure
            var htmlStructure = '<section data-timestamp=' +
            self.currentToken + '>';
            htmlStructure += '<h2>';
            htmlStructure += headerDate(self.currentToken);
            htmlStructure += '</h2>';
            htmlStructure += "<ol id='" + self.currentToken +
            "' class='log-group'>";
            htmlStructure += '</ol>';
            htmlStructure += '</section>';

            self.view.innerHTML += htmlStructure;
            document.getElementById(self.currentToken).
            appendChild(self.createEntry(recents[i]));
          } else {
            document.getElementById(self.currentToken).
            appendChild(self.createEntry(recents[i]));
          }
        }
      } else {
        var no_result = document.createElement('section');
        no_result.classList.add('grid');
        no_result.classList.add('grid-wrapper');
        no_result.classList.add('center');

        no_result.innerHTML = '<div class="grid-cell grid-v-align">' +
        '<header class="header-noresult">' +
        '<section class="header-text-noresult">CALL, CHAT, TEXT...</section>' +
        '<section class="header-text-noresult">' +
        'START COMMUNICATING NOW</section>' +
        '</header>' +
        '<section><div class="icon-noresult"></div></section>' +
        '</div>';
        document.getElementById('contacts-container').appendChild(no_result);
      }
    });
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
  },

  showLast: function re_showLast() {
    this.view.scrollTop = 0;
  },

  startUpdatingDates: function re_startUpdatingDates() {
    if (this._prettyDatesInterval || !this.view)
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
});

window.addEventListener('unload', function recentsCleanup(evt) {
  window.removeEventListener('unload', recentsCleanup);
  Recents.cleanup();
});
