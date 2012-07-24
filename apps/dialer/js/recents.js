'use strict';

var Recents = {
  DBNAME: 'dialerRecents',
  STORENAME: 'dialerRecents',

  _recentsEditionMode: false,

  get recentsIconEdit() {
    delete this.recentsIconEdit;
    return this.recentsIconEdit = document.getElementById('recents-icon-edit');
  },

  get recentsIconClose() {
    delete this.recentsIconClose;
    return this.recentsIconClose = document.
      getElementById('recents-icon-close');
  },

  get recentsIconDone() {
    delete this.recentsIconDone;
    return this.recentsIconDone = document.getElementById('thread-done-button');
  },

  get recentsContainer() {
    delete this.recentsContainer;
    return this.recentsContainer = document.getElementById('recents-container');
  },

  get recentsView() {
    delete this.recentsView;
    return this.recentsView = document.getElementById('recents-view');
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

  get deleteAllThreads() {
    delete this.deleteAllThreads;
    return this.deleteAllThreads = document.
      getElementById('delete-all-threads');
  },

  get deleteSelectedThreads() {
    delete this.deleteSelectedThreads;
    return this.deleteSelectedThreads = document.
      getElementById('delete-selected-threads');
  },

  init: function re_init() {
    if (this.recentsFilterContainer) {
      this.recentsFilterContainer.addEventListener('click',
        this.filter.bind(this));
    }
    if (this.recentsIconEdit) {
      this.recentsIconEdit.addEventListener('click',
        this.recentsHeaderAction.bind(this));
    }
    if (this.recentsIconClose) {
      this.recentsIconClose.addEventListener('click',
        this.recentsHeaderAction.bind(this));
    }
    if (this.recentsIconDone) {
      this.recentsIconDone.addEventListener('click',
        this.recentsHeaderAction.bind(this));
    }
    if (this.deleteAllThreads) {
      this.deleteAllThreads.addEventListener('click',
        this.deleteAll.bind(this));
    }
    if (this.deleteSelectedThreads) {
      this.deleteSelectedThreads.addEventListener('click',
        this.deleteSelected.bind(this));
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

    this._cachedContacts = new Object();
    this.render();
  },

  recentsHeaderAction: function re_recentsIconEditAction(event) {
    this.recentsView.classList.toggle('recents-edit');
    var logItems = this.recentsContainer.
      querySelectorAll('.log-item:not(.collapsed)');
    var logItemsLenght = logItems.length;
    var contactPhoto;
    var contactSelection;
    for (var i = 0; i < logItemsLenght; i++) {
      contactPhoto = logItems[i].querySelector('.call-log-contact-photo');
      contactSelection = logItems[i].querySelector('.call-log-selection');
      contactPhoto.classList.toggle('hide');
      contactSelection.classList.toggle('show');
      if (this._recentsEditionMode) {
        contactSelection.classList.remove('selected');
      }
    }
    this._recentsEditionMode = !this._recentsEditionMode;
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
        var noMissedCallsItem = noMissedCallsItems[i];
        var noMissedCallsDay = noMissedCallsItem.parentNode.parentNode;
        noMissedCallsDay.classList.remove('hide');
        noMissedCallsItem.classList.remove('hide');
      }
    } else {
      for (i = 0; i < noMissedCallsLength; i++) {
        var noMissedCallsItem = noMissedCallsItems[i];
        noMissedCallsItem.classList.add('hide');
        var noMissedCallsItemParent = noMissedCallsItem.parentNode;
        var notHiddenCalls = noMissedCallsItemParent.
          querySelectorAll('.log-item:not(.hide)');
        if (notHiddenCalls.length == 0) {
          var notHiddenCallsDay = noMissedCallsItemParent.parentNode;
          notHiddenCallsDay.classList.add('hide');
        }
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

  deleteAll: function re_deleteAll() {
    var self = this;

    this.getDatabase(function(database) {
      var txn = database.transaction(self.STORENAME, 'readwrite');
      var store = txn.objectStore(self.STORENAME);

      var delAllReq = store.clear();
      delAllReq.onsuccess = function da_onsuccess() {
        self.recentsContainer.innerHTML = '';
        self.recentsHeaderAction(null);
      };

      delAllReq.onerror = function da_onerror(e) {
        console.log('dialerRecents delete all failure: ',
          e.message, setreq.errorCode);
      };
    });
  },

  deleteSelected: function re_deleteSelected() {
    var self = this;

    this.getDatabase(function(database) {
      var txn = database.transaction(self.STORENAME, 'readwrite');
      var store = txn.objectStore(self.STORENAME);

      var selectedLogItems = self.recentsContainer.
        querySelectorAll('.log-item.selected');
      var selectedLogItemsLength = selectedLogItems.length;
      var callType;
      var phoneNumber;
      var phoneNumberType;
      var groupSelector;
      var groupSelectorAux;
      var groupItemLogs;
      var groupItemLogsAux;
      var sameDaySection;
      for (var i = 0; i < selectedLogItemsLength; i++) {
        if (selectedLogItems[i].dataset.count > 1) {
          callType = selectedLogItems[i].dataset.type;
          phoneNumber = selectedLogItems[i].dataset.num.trim();
          phoneNumberType = selectedLogItems[i].dataset.phoneType;
          sameDaySection = selectedLogItems[i].parentNode;
          if (callType.indexOf('dialing') != -1) {
            groupSelector = '[data-num^="' + phoneNumber +
              '"]' + (phoneNumberType ? ('[data-phone-type="' +
                phoneNumberType + '"]') : '') +
              '[data-type="dialing-refused"].collapsed';
            groupItemLogs = sameDaySection.querySelectorAll(groupSelector);
          } else if (callType.indexOf('incoming-connected') != -1) {
            groupSelector = '[data-num^="' + phoneNumber +
              '"]' + (phoneNumberType ? ('[data-phone-type="' +
                phoneNumberType + '"]') : '') +
              '[data-type="incoming-connected"].collapsed';
            groupItemLogs = sameDaySection.querySelectorAll(groupSelector);
          } else {
            groupSelector = '[data-num^="' + phoneNumber +
              '"]' + (phoneNumberType ? ('[data-phone-type="' +
                phoneNumberType + '"]') : '') +
              '[data-type="incoming"].collapsed';
            groupItemLogs = sameDaySection.querySelectorAll(groupSelector);
            groupSelectorAux = '[data-num^="' + phoneNumber +
              '"]' + (phoneNumberType ? ('[data-phone-type="' +
                phoneNumberType + '"]') : '') +
              '[data-type="incoming-refused"].collapsed';
            groupItemLogsAux = sameDaySection.querySelector(groupSelectorAux);
          }
          var groupItemLogsLength = groupItemLogs.length;
          for (var j = 0; j < groupItemLogsLength; j++) {
            self.deleteEntry(store, groupItemLogs[j]);
          }
          if (groupItemLogsAux) {
            var groupItemLogsAuxLength = groupItemLogsAux.length;
            for (var k = 0; k < groupItemLogsAuxLength; k++) {
              self.deleteEntry(store, groupItemLogsAux[k]);
            }
          }
          self.deleteEntry(store, selectedLogItems[i]);
        } else {
          self.deleteEntry(store, selectedLogItems[i]);
        }
      }
    });
    self.recentsHeaderAction(null);
  },

  deleteEntry: function re_deleteEntry(store, logItem) {
    var delSelReq = store.delete(parseInt(logItem.dataset.date));

    delSelReq.onsuccess = function ds_onsuccess(deletedLogItem, e) {
      var deletedLogItemParent = deletedLogItem.parentNode;
      deletedLogItemParent.removeChild(deletedLogItem);
      if (deletedLogItemParent.childNodes.length == 0) {
        var deletedLogItemDay = deletedLogItemParent.parentNode;
        var deletedLogItemDayParent = deletedLogItemDay.parentNode;
        deletedLogItemDayParent.removeChild(deletedLogItemDay);
      } else if (this.missedFilter.classList.contains('selected')) {
        var notHiddenCalls = deletedLogItemParent.
          querySelectorAll('.log-item:not(.hide)');
        if (notHiddenCalls.length == 0) {
          var notHiddenCallsDay = deletedLogItemParent.parentNode;
          notHiddenCallsDay.classList.add('hide');
        }
      }
    }.bind(this, logItem);

    delSelReq.onerror = function ds_onerror(e) {
      console.log('dialerRecents delete selected failure: ',
        e.message, setreq.errorCode);
    }
  },

  click: function re_click(target) {
    if (!this._recentsEditionMode) {
      var number = target.dataset.num.trim();
      if (number) {
        CallHandler.call(number);
      }
    } else {
      target.classList.toggle('selected');
      target.querySelector('.call-log-selection').classList.toggle('selected');
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
      ((localStorage.getItem('latestCallLogVisit') < recent.date) ?
        'highlighted' : '') +
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
      '  <section class="call-log-selection">' +
      '  </section>' +
      '</li>';
    return entry;
  },

  render: function re_render() {
    if (!this.recentsContainer)
      return;

    var self = this;
    this.history(function showRecents(recents) {
      if (recents.length == 0) {
        self.recentsContainer.innerHTML = '';
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
      self.recentsContainer.innerHTML = content;

      self.updateContactDetails();
    });
  },

  updateContactDetails: function re_updateContactDetails() {
    var itemSelector = '.log-item';
    var callLogItems = document.querySelectorAll(itemSelector);
    var length = callLogItems.length;
    var phoneNumber;
    this._updateCounter = 0;
    for (var i = 0; i < length; i++) {
      phoneNumber = callLogItems[i].dataset.num.trim();
      var cachedContact = this._cachedContacts[phoneNumber];
      if (cachedContact) {
        this.contactCallBack(callLogItems[i], length, cachedContact);
      } else {
        Contacts.findByNumber(
          phoneNumber,
          this.contactCallBack.bind(this, callLogItems[i], length));
      }
    }
  },

  contactCallBack: function re_contactCallBack(logItem, max, contact) {
    var primaryInfo = logItem.querySelector('.primary-info');
    var contactPhoto = logItem.querySelector('.call-log-contact-photo');
    if (contact) {
      if (contact.name) {
        primaryInfo.textContent =
          contact.name;
      }
      if (contact.photo) {
        contactPhoto.classList.add('knownContact');
        contactPhoto.style.backgroundImage = 'url(' + contact.photo + ')';
      }
      var phoneNumber = logItem.dataset.num.trim();
      var secondaryInfo = logItem.querySelector('.secondary-info');
      var contactPhoneNumber;
      var phoneEntry;
      var length = contact.tel.length;
      for (var i = 0; i < length; i++) {
        phoneEntry = contact.tel[i];
        contactPhoneNumber = phoneEntry.number.replace(' ', '', 'g');
        if ((phoneNumber == contactPhoneNumber) && (phoneEntry.type)) {
          secondaryInfo.textContent = secondaryInfo.textContent.trim() +
            '   ' + phoneEntry.type;
          logItem.dataset.phoneType = phoneEntry.type;
        }
      }
      this._cachedContacts[phoneNumber] = contact;
    } else {
      contactPhoto.classList.add('unknownContact');
    }

    this._updateCounter++;
    if (this._updateCounter == max) {
      this.groupCallsInCallLog();
    }
  },

  groupCallsInCallLog: function re_groupCallsInCallLog() {
    // The grouping of the calls is per day, per contact, per contact
    //  phone number type (Home, Work, Mobile, etc.) and per type of call
    //  (outgoing, incoming, missed).
    var daySelector = '.log-group';
    var daysElements = document.querySelectorAll(daySelector);
    var daysElementsLength = daysElements.length;
    var itemSelector = '.log-item';
    var callLogItems, length, phoneNumber, phoneNumberType, callType,
      callCount, callDate, sameTypeCallSelector, sameTypeCall,
      sameTypeCallSelectorAux, sameTypeCallAux, sameTypeCallCount;
    for (var dayElementsCounter = 0; dayElementsCounter < daysElementsLength;
      dayElementsCounter++) {
      callLogItems = daysElements[dayElementsCounter].
        querySelectorAll(itemSelector);
      length = callLogItems.length;
      for (var i = 0; i < length; i++) {
        phoneNumber = callLogItems[i].dataset.num.trim();
        phoneNumberType = callLogItems[i].dataset.phoneType;
        callType = callLogItems[i].dataset.type;
        callCount = (callLogItems[i].dataset.count ?
          parseInt(callLogItems[i].dataset.count) : 1);
        callDate = callLogItems[i].dataset.date;
        if (callType.indexOf('dialing') != -1) {
          sameTypeCallSelector = '[data-num^="' + phoneNumber +
            '"]' + (phoneNumberType ? ('[data-phone-type="' +
              phoneNumberType + '"]') : '') +
            '[data-type="dialing-refused"][data-count]:not(.hide)';
          sameTypeCall = daysElements[dayElementsCounter].
            querySelector(sameTypeCallSelector);
        } else if (callType.indexOf('incoming-connected') != -1) {
          sameTypeCallSelector = '[data-num^="' + phoneNumber +
            '"]' + (phoneNumberType ? ('[data-phone-type="' +
              phoneNumberType + '"]') : '') +
            '[data-type="incoming-connected"][data-count]:not(.hide)';
          sameTypeCall = daysElements[dayElementsCounter].
            querySelector(sameTypeCallSelector);
        } else {
          sameTypeCallSelector = '[data-num^="' + phoneNumber +
            '"]' + (phoneNumberType ? ('[data-phone-type="' +
              phoneNumberType + '"]') : '') +
            '[data-type="incoming"][data-count]:not(.hide)';
          sameTypeCall = daysElements[dayElementsCounter].
            querySelector(sameTypeCallSelector);
          sameTypeCallSelectorAux = '[data-num^="' + phoneNumber +
            '"]' + (phoneNumberType ? ('[data-phone-type="' +
              phoneNumberType + '"]') : '') +
            '[data-type="incoming-refused"][data-count]:not(.hide)';
          sameTypeCallAux = daysElements[dayElementsCounter].
            querySelector(sameTypeCallSelectorAux);
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
            this.groupCalls(callLogItems[i], sameTypeCall,
              sameTypeCallCount, 1);
          } else {
            this.groupCalls(sameTypeCall, callLogItems[i],
              callCount, sameTypeCallCount);
          }
        }
      }
    }
  },

  groupCalls: function re_groupCalls(olderCallEl, newerCallEl, count, inc) {
    olderCallEl.classList.add('hide');
    olderCallEl.classList.add('collapsed');
    var primaryInfo = newerCallEl.querySelector('.primary-info');
    var callDetails = primaryInfo.textContent.trim();
    var countIndex = callDetails.indexOf('(' + count + ')');
    count += inc;
    if (countIndex != -1) {
      primaryInfo.textContent = callDetails.substr(0, countIndex) +
        '(' + count + ')';
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
  },

  updateLatestVisit: function re_updateLatestVisit() {
    localStorage.setItem('latestCallLogVisit', Date.now());
  },

  updateHighlighted: function re_updateHighlighted() {
    var itemSelector = '.log-item.highlighted';
    var items = document.querySelectorAll(itemSelector);
    var itemsLength = items.length;
    for (var i = 0; i < itemsLength; i++) {
      items[i].classList.remove('highlighted');
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
