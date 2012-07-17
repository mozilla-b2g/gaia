'use strict';

var Recents = {
  DBNAME: 'dialerRecents',
  STORENAME: 'dialerRecents',

  get view() {
    delete this.view;
    return this.view = document.getElementById('recents-container');
  },

  get recentsFilterContainer() {
    delete this.recentsFilterContainer;
    return this.recentsFilterContainer = document.getElementById(
      'recents-filter-container');
  },

  get allFilter() {
    delete this.allFilter;
    return this.allFilter = document.getElementById('allFilter');
  },

  get missedFilter() {
    delete this.missedFilter;
    return this.missedFilter = document.getElementById('missedFilter');
  },

  init: function re_init() {
    if (this.recentsFilterContainer) {
      this.recentsFilterContainer.addEventListener('click',
        this.filter.bind(this));
    }

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

  filter: function re_filter(event) {
    if (event.target.classList.contains('selected')) {
      return;
    }
    var action = event.target.dataset.action;
    var noMissedCallsSelector = '.log-item[data-type^=dialing]' +
      ':not(.collapsed), ' +
      '.log-item[data-type=incoming-connected]:not(.collapsed)';
    var noMissedCallsItems = document.querySelectorAll(noMissedCallsSelector);
    var noMissedCallsLength = noMissedCallsItems.length;
    var i;
    var allCalls = (action == 'all');
    if (allCalls) {
      for (i = 0; i < noMissedCallsLength; i++) {
        noMissedCallsItems[i].classList.remove('hide');
      }
    } else {
      for (i = 0; i < noMissedCallsLength; i++) {
        noMissedCallsItems[i].classList.add('hide');
      }
    }
    this.allFilter.classList.toggle('selected');
    this.missedFilter.classList.toggle('selected');
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
    var fontDateClasses = '';
    if (recent.type.indexOf('dialing') != -1) {
      classes += 'icon-outgoing';
    } else if (recent.type.indexOf('incoming') != -1) {
      if (recent.type.indexOf('connected') == -1) {
        classes += 'icon-missed';
        fontDateClasses = 'missed-call-font';
      } else {
        classes += 'icon-incoming';
      }
    }

    var entry =
      '<li class="log-item ' +
      '  " data-num="' + recent.number +
      '  " data-date="' + recent.date +
      '  " data-type="' + recent.type + '">' +
      '  <section class="icon-container grid center">' +
      '    <div class="grid-cell grid-v-align">' +
      '      <div class="call-type-icon ' + classes + '"></div>' +
      '    </div>' +
      '  </section>' +
      '  <section class="log-item-info grid">' +
      '    <div class="grid-cell grid-v-align">' +
      '      <section class="primary-info ellipsis">' +
      recent.number +
      '      </section>' +
      '      <section class="' + fontDateClasses +
      '        secondary-info ellipsis">' + prettyDate(recent.date) +
      '      </section>' +
      '    </div>' +
      '  </section>' +
      '  <section class="call-log-contact-photo">' +
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

      self.groupCallsByContactDayType();
    });
  },

  updateContactDetails: function re_updateContactDetails() {
    var itemSelector = '.log-item';
    var callLogItems = document.querySelectorAll(itemSelector);
    var length = callLogItems.length;
    for (var i = 0; i < length; i++) {
      Contacts.findByNumber(
        callLogItems[i].querySelector('.primary-info').textContent.trim(),
        function re_contactCallBack(itemLogEl, contact) {
          if (contact) {
            if (contact.name) {
              itemLogEl.querySelector('.primary-info').textContent =
                contact.name;
            }
            if (contact.photo) {
              itemLogEl.querySelector('.call-log-contact-photo').
                style.backgroundImage = 'url(' + contact.photo + ')';
            }
          }
        }.bind(this, callLogItems[i]));
    }
  },

  groupCallsByContactDayType: function re_groupCallsByContactDayType() {
    var daySelector = '.log-group';
    var daysElements = document.querySelectorAll(daySelector);
    var daysElementsLength = daysElements.length;
    var itemSelector = '.log-item';
    var callLogItems, length, phoneNumber, callType, callCount, callDate,
      sameTypeCallSelector, sameTypeCall, sameTypeCallSelectorAux, sameTypeCallAux,
      sameTypeCallCount;
    for (var dayElementsCounter = 0; dayElementsCounter < daysElementsLength;
      dayElementsCounter++) {
      callLogItems = daysElements[dayElementsCounter].
        querySelectorAll(itemSelector);
      length = callLogItems.length;
      for (var i = 0; i < length; i++) {
        phoneNumber = callLogItems[i].dataset.num.trim();
        callType = callLogItems[i].dataset.type;
        callCount = (callLogItems[i].dataset.count ? parseInt(callLogItems[i].dataset.count) : 1);
        callDate = callLogItems[i].dataset.date;
        if (callType.indexOf('dialing') != -1) {
          sameTypeCallSelector = '[data-num^="' + phoneNumber + '"][data-type^="dialing"][data-count]:not(.hide)';
          sameTypeCall = daysElements[dayElementsCounter].querySelector(sameTypeCallSelector);
        } else if(callType.indexOf('incoming-connected') != -1) {
          sameTypeCallSelector = '[data-num^="' + phoneNumber + '"][data-type="incoming-connected"][data-count]:not(.hide)';
          sameTypeCall = daysElements[dayElementsCounter].querySelector(sameTypeCallSelector);
        } else {
          sameTypeCallSelector = '[data-num^="' + phoneNumber + '"][data-type="incoming"][data-count]:not(.hide)';
          sameTypeCall = daysElements[dayElementsCounter].querySelector(sameTypeCallSelector);
          sameTypeCallSelectorAux = '[data-num^="' + phoneNumber + '"][data-type="incoming-refused"][data-count]:not(.hide)';
          sameTypeCallAux = daysElements[dayElementsCounter].querySelector(sameTypeCallSelectorAux);
          if (sameTypeCallAux) {
            if (sameTypeCall) {
              if (sameTypeCall.dataset.date < sameTypeCallAux.dataset.date) {
                sameTypeCall = sameTypeCallAux;
              }
            } else {
              sameTypeCall = sameTypeCallAux;
            }
          }
        }
        callLogItems[i].dataset.count = callCount;
        if (sameTypeCall) {
          sameTypeCallCount = parseInt(sameTypeCall.dataset.count);
          if (sameTypeCall.dataset.date > callDate) {
            this.groupCalls(callLogItems[i], sameTypeCall, sameTypeCallCount, 1);
          } else {
            this.groupCalls(sameTypeCall, callLogItems[i], callCount, sameTypeCallCount);
          }
        }
      }
    }
  },

  groupCalls: function re_groupCalls(olderCallEl, newerCallEl, count, increment) {
    olderCallEl.classList.add('hide');
    olderCallEl.classList.add('collapsed');
    var primaryInfo = newerCallEl.querySelector('.primary-info');
    var callDetails = primaryInfo.textContent.trim();
    var countIndex = callDetails.indexOf('(' + count + ')');
    count += increment;
    if (countIndex != -1) {
      primaryInfo.textContent = callDetails.substr(0, countIndex) + '(' + count + ')';
    } else {
      primaryInfo.textContent = callDetails + ' (' + count + ')';
    }
    newerCallEl.dataset.count = count;
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
