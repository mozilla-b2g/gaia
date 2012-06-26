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
      console.log(JSON.stringify(recentCall));
      setreq.onsuccess = function() {
        //TODO Update commslog when call received/made

      };
      setreq.onerror = function(e) {
        console.log('dialerRecents add failure: ', e.message, setreq.errorCode);
      };
    }).bind(this));


  },
  createEntry: function re_createEntry(recent) {
    // Create element
    var entry = document.createElement('li');

    // Add class
    entry.classList.add('log-item');
    // Create HTML structure
    var html_structure = "<section class='icon-container grid center'>";
    html_structure += "<div class='grid-cell grid-v-align'><div class='icon ";

    // Depending on call type we add icon
    if (recent.type.indexOf('dialing') != -1) {
      html_structure += 'icon-outgoing';
    } else {
      if (recent.type != 'incoming') {
        html_structure += 'icon-incoming';
      } else {
        html_structure += 'icon-missed';
      }
    }

    html_structure += "'></div></div>";
    html_structure += '</section>';
    html_structure += "<section class='log-item-info grid'>";
    html_structure += "<div class='grid-cell grid-v-align'>";
    //Check if contact is in Agenda
    Contacts.findByNumber(recent.number, function findContact(contact) {
      if (contact) {
        html_structure += "<section class='primary-info ellipsis'>";
        html_structure += (contact.name || recent.number) + '</section>';
      }
    });
    html_structure += "<section class='primary-info ellipsis'>";
    html_structure += recent.number + '</section>';
    html_structure += "<section class='secondary-info ellipsis'>";
    html_structure += prettyDate(recent.date) + '</section>';
    html_structure += '</div>';
    html_structure += '</section>';

    entry.innerHTML = html_structure;
    return entry;
  },
  render: function re_render() {
    Recents.history(function(recents) {
      //Clean DOM
      var dom_container = document.getElementById('contacts-container');
      dom_container.innerHTML = '';
      if (recents.length > 0) {
        //Update token
        Recents.current_token = 0;
        for (var i = 0; i < recents.length; i++) {
          // We retrieve temp token
          var token_tmp = Recents.getDayDate(recents[i].date);
          // Compare tokens
          if (token_tmp > Recents.current_token) {
            // Update token
            Recents.current_token = token_tmp;
            // Create structure
            var html_structure = '<section data-timestamp=' +
            Recents.current_token + '>';
            html_structure += '<h2>';
            html_structure += headerDate(Recents.current_token);
            html_structure += '</h2>';
            html_structure += "<ol id='" + Recents.current_token +
            "' class='log-group'>";
            html_structure += '</ol>';
            html_structure += '</section>';


            dom_container.innerHTML += html_structure;
            document.getElementById(Recents.current_token).
            appendChild(Recents.createEntry(recents[i]));
          }else {
            document.getElementById(Recents.current_token).
            appendChild(Recents.createEntry(recents[i]));
          }

        }// FOR END
      }else {
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
        // document.getElementById('contacts-container').innerHTML='<section></section>';
        document.getElementById('contacts-container').appendChild(no_result);

      }// IF ELSE END
    });
  },
  getDayDate: function re_getDayDate(timestamp) {

    var date = new Date(timestamp);
    var start_date = new Date(date.getFullYear(),
    date.getMonth(), date.getDate());
    return start_date.getTime();
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
  Recents.render();
});

window.addEventListener('unload', function recentsCleanup(evt) {
  window.removeEventListener('unload', recentsCleanup);
  Recents.cleanup();
});
