'use strict';

var _ = navigator.mozL10n.get;

var Recents = {

  get headerEditModeText() {
    delete this.headerEditModeText;
    return this.headerEditModeText = document.
                                    getElementById('header-edit-mode-text');
  },

  get recentsIconEdit() {
    delete this.recentsIconEdit;
    return this.recentsIconEdit = document.getElementById('edit-button');
  },

  get recentsIconClose() {
    delete this.recentsIconClose;
    return this.recentsIconClose = document.getElementById('cancel-button');
  },

  get recentsIconDelete() {
    delete this.recentsIconDelete;
    return this.recentsIconDelete = document.getElementById('delete-button');
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

  get deselectAllThreads() {
    delete this.deselectAllThreads;
    return this.deselectAllThreads = document.
      getElementById('deselect-all-threads');
  },

  get selectAllThreads() {
    delete this.selectAllThreads;
    return this.selectAllThreads = document.
      getElementById('select-all-threads');
  },

  init: function re_init() {
    var self = this;
    if (this.recentsFilterContainer) {
      this.recentsFilterContainer.addEventListener('click',
        function re_recentsFilterHandler(event) {
          if (document.body.classList.contains('recents-edit')) {
            self.recentsHeaderAction('cancel-button');
          }
          self.filter(event);
      });
    }
    if (this.recentsIconEdit) {
      this.recentsIconEdit.addEventListener('click',
        this.recentsHeaderAction.bind(this));
    }
    if (this.recentsIconClose) {
      this.recentsIconClose.addEventListener('click',
        this.recentsHeaderAction.bind(this));
    }
    if (this.recentsIconDelete) {
      this.recentsIconDelete.addEventListener('click',
        this.executeDeletion.bind(this));
    }
    if (this.deselectAllThreads) {
      this.deselectAllThreads.addEventListener('click',
        this.deselectSelectedEntries.bind(this));
    }
    if (this.selectAllThreads) {
      this.selectAllThreads.addEventListener('click',
        this.selectAllEntries.bind(this));
    }
    if (this.recentsContainer) {
      this.recentsContainer.addEventListener('click',
        this.click.bind(this));
    }

    RecentsDBManager.init(function() {
      RecentsDBManager.get(function(recents) {
        Recents.render(recents);
      });
    });
  },

  recentsHeaderAction: function re_recentsIconEditAction(event) {
    if (event) {
      switch (event.target ? event.target.id : event) {
        case 'edit-button': // Entering edit mode
          // Updating header
          this.headerEditModeText.textContent = _('edit');
          this.deselectSelectedEntries();
          document.body.classList.toggle('recents-edit');
          break;
        case 'cancel-button': // Exit edit mode with no deletions
          document.body.classList.toggle('recents-edit');
          break;
      }
    }
  },

  filter: function re_filter(event) {
    // do nothing if selected tab is same that current
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
      var visibleCalls = this.recentsContainer.
        querySelectorAll('.log-item:not(.hide)');
      if (visibleCalls.length > 0) {
        this.recentsIconEdit.classList.remove('disabled');
      } else {
        this.recentsIconEdit.classList.add('disabled');
      }
      if (document.body.classList.contains('recents-edit')) {
        var selectedCalls = this.recentsContainer.
          querySelectorAll('.log-item:not(.hide).selected');
        var selectedCallsLength = selectedCalls.length;
        if (selectedCallsLength == 0) {
          this.headerEditModeText.textContent = _('edit');
        } else {
          this.headerEditModeText.textContent = _('edit-selected',
                                                  {n: selectedCallsLength});
        }
      }
      if (this._allViewGroupingPending) {
        this.groupCallsInCallLog();
        this._allViewGroupingPending = false;
        this._missedViewGroupingPending = false;
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
        var visibleCalls = this.recentsContainer.
          querySelectorAll('.log-item:not(.hide)');
        if (visibleCalls.length == 0) {
          this.recentsIconEdit.classList.add('disabled');
        } else {
          this.recentsIconEdit.classList.remove('disabled');
        }
        if (document.body.classList.contains('recents-edit')) {
          var selectedCalls = this.recentsContainer.
            querySelectorAll('.log-item:not(.hide).selected');
          var selectedCallsLength = selectedCalls.length;
          if (selectedCallsLength == 0) {
            this.headerEditModeText.textContent = _('edit');
          } else {
            this.headerEditModeText.textContent = _('edit-selected',
                                                    {n: selectedCallsLength});
          }
        }
      }
      if (this._missedViewGroupingPending) {
        this.groupCallsInCallLog();
        this._missedViewGroupingPending = false;
      }
    }
    this.allFilter.classList.toggle('selected');
    this.missedFilter.classList.toggle('selected');

  },

  selectAllEntries: function re_selectAllEntries() {
    var itemSelector = '.log-item';
    var items = document.querySelectorAll(itemSelector);
    var count = items.length;
    for (var i = 0; i < count; i++) {
      items[i].classList.add('selected');
    }
    var itemShown = document.querySelectorAll('.log-item:not(.hide)');
    var itemsCounter = itemShown.length;
    this.headerEditModeText.textContent = _('edit-selected',
                                            {n: itemsCounter});
    this.recentsIconDelete.classList.remove('disabled');
    this.deselectAllThreads.classList.remove('disabled');
  },

  deselectSelectedEntries: function re_deselectSelectedEntries() {
    var itemSelector = '.log-item.selected';
    var items = document.querySelectorAll(itemSelector);
    var length = items.length;
    for (var i = 0; i < length; i++) {
      items[i].classList.remove('selected');
    }
    this.headerEditModeText.textContent = _('edit');
    this.recentsIconDelete.classList.add('disabled');
    this.deselectAllThreads.classList.add('disabled');
  },

  executeDeletion: function re_executeDeletion() {
    var response = window.confirm(_('confirm-deletion'));
    if (!response) {
      return;
    }
    var selectedEntries = this.getSelectedEntries(),
        selectedLength = selectedEntries.length,
        entriesInGroup, entriesInGroupLength;
    var itemsToDelete = [];
    for (var i = 0; i < selectedLength; i++) {
      entriesInGroup = this.getEntriesInGroup(selectedEntries[i]);
      entriesInGroupLength = entriesInGroup.length;
      for (var j = 0; j < entriesInGroupLength; j++) {
        itemsToDelete.push(parseInt(entriesInGroup[j].dataset.date));
      }
    }
    var self = this;
    RecentsDBManager.deleteList.call(RecentsDBManager,
      itemsToDelete, function deleteCB() {
        RecentsDBManager.get(function(recents) {
          self.render(recents);
          document.body.classList.remove('recents-edit');
        });
    });
  },

  getSameTypeCallsOnSameDay: function re_getSameTypeCallsOnSameDay(
    day, phoneNumber, phoneNumberType, callType, startingWith) {
    var groupSelector = '[data-num^="' + phoneNumber +
      '"]' + (phoneNumberType ? ('[data-phone-type="' +
      phoneNumberType + '"]') : '') +
      '[data-type' + (startingWith ? '^' : '') + '="' + callType + '"]';
    return day.querySelectorAll(groupSelector);
  },

  getMostRecentCallWithSameTypeOnSameDay:
    function getMostRecentCallWithSameTypeOnSameDay(
      day, phoneNumber, phoneNumberType, callType, startingWith) {
    var groupSelector = '[data-num^="' + phoneNumber +
      '"]' + (phoneNumberType ? ('[data-phone-type="' +
      phoneNumberType + '"]') : '') +
      '[data-type' + (startingWith ? '^' : '') + '="' + callType +
      '"][data-count]:not(.hide)';
    return day.querySelector(groupSelector);
  },

  getEntriesInGroup: function re_getEntriesInGroup(logItem) {
    var entriesInGroup = new Array(),
    groupItemLogs, groupItemLogsAux,
      callType = logItem.dataset.type,
      phoneNumber = logItem.dataset.num.trim(),
      phoneNumberType = logItem.dataset.phoneType,
      sameDaySection = logItem.parentNode;
    if (callType.indexOf('dialing') != -1) {
      groupItemLogs = this.getSameTypeCallsOnSameDay(
        sameDaySection, phoneNumber, phoneNumberType, 'dialing', true);
    } else if (callType.indexOf('incoming-connected') != -1) {
      groupItemLogs = this.getSameTypeCallsOnSameDay(
        sameDaySection, phoneNumber, phoneNumberType,
          'incoming-connected', false);
    } else {
      groupItemLogs = this.getSameTypeCallsOnSameDay(
        sameDaySection, phoneNumber, phoneNumberType, 'incoming', false);
      groupItemLogsAux = this.getSameTypeCallsOnSameDay(
        sameDaySection, phoneNumber, phoneNumberType, 'incoming-refused',
          false);
    }
    if (groupItemLogs && groupItemLogs.length > 0) {
      for (var i = 0; i < groupItemLogs.length; i++) {
        entriesInGroup.push(groupItemLogs[i]);
      }
    }
    if (groupItemLogsAux && groupItemLogsAux.length > 0) {
      for (var i = 0; i < groupItemLogsAux.length; i++) {
        entriesInGroup.push(groupItemLogsAux[i]);
      }
    }
    return entriesInGroup;
  },

  click: function re_click(event) {
    var target = event.target;
    if (!target) {
      return;
    }
    if (!document.body.classList.contains('recents-edit')) {
      if (target.classList.contains('call-log-contact-photo')) {
        event.stopPropagation();
        var contactId = target.parentNode.dataset['contactId'];
        var phoneNumber = target.parentNode.dataset.num.trim();
        Recents.viewOrCreate(contactId, phoneNumber);
      } else if (target.classList.contains('log-item')) {
        var number = target.dataset.num.trim();
        if (number) {
          this.updateLatestVisit();
          CallHandler.call(number);
        }
      }
    } else {
      if (target.classList.contains('call-log-contact-photo')) {
        target.parentNode.classList.toggle('selected');
        event.stopPropagation();
      } else if (target.classList.contains('log-item')) {
        target.classList.toggle('selected');
      }
      var count = this.getSelectedEntries().length;
      if (count == 0) {
        this.headerEditModeText.textContent = _('edit');
        this.recentsIconDelete.classList.add('disabled');
        this.deselectAllThreads.classList.add('disabled');
      } else {
        this.headerEditModeText.textContent = _('edit-selected',
                                                {n: count});
        this.recentsIconDelete.classList.remove('disabled');
        this.deselectAllThreads.classList.remove('disabled');
      }
    }
  },

  viewOrCreate: function re_viewOrCreate(contactId, phoneNumber) {
    var contactsIframe = document.getElementById('iframe-contacts');
    var src = '/contacts/index.html';
    if (contactId) {
      src += '#view-contact-details?id=' + contactId;
    } else {
      src += '#view-contact-form?tel=' + phoneNumber;
    }
    var timestamp = new Date().getTime();
    contactsIframe.src = src + '&timestamp=' + timestamp;
    window.location.hash = '#contacts-view';
  },

  getSelectedEntries: function re_getSelectedGroups() {
    var itemSelector = '.log-item:not(.hide).selected';
    var items = document.querySelectorAll(itemSelector);
    return items;
  },

  createRecentEntry: function re_createRecentEntry(recent) {
    var classes = 'icon ';
    if (recent.type.indexOf('dialing') != -1) {
      classes += 'icon-outgoing';
    } else if (recent.type.indexOf('incoming') != -1) {
      if (recent.type.indexOf('connected') == -1) {
        classes += 'icon-missed';
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
      '  <section class="call-log-selection">' +
      '  </section>' +
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
      '      <section class="secondary-info">' +
      '        <span class="call-time">' +
                 Utils.prettyDate(recent.date) +
      '        </span>' +
      '        <span class="call-additional-info ellipsis">' +
      '        </span>' +
      '      </section>' +
      '    </div>' +
      '  </section>' +
      '  <section class="call-log-contact-photo' + '">' +
      '  </section>' +
      '</li>';
    return entry;
  },

  render: function re_render(recents) {
    if (!this.recentsContainer)
      return;
    if (recents.length == 0) {
      this.recentsContainer.innerHTML =
        '<div id="no-result-container">' +
        ' <div id="no-result-message">' +
        ' <p data-l10n-id="no-logs-msg-1">no calls recorded</p>' +
        ' <p data-l10n-id="no-logs-msg-2">start communicating now</p>' +
        ' </div>' +
        '</div>';
      navigator.mozL10n.translate(this.recentsContainer);
      this.recentsIconEdit.classList.add('disabled');
      return;
    }

    this.recentsIconEdit.classList.remove('disabled');
    var content = '',
      currentDay = '';
    for (var i = 0; i < recents.length; i++) {
      var day = Utils.getDayDate(recents[i].date);
      if (day != currentDay) {
        if (currentDay != '') {
          content += '</ol></section>';
        }
        currentDay = day;
        content +=
          '<section data-timestamp="' + day + '">' +
          ' <h2 id="header-day-' + day + '">' + Utils.headerDate(day) +
          ' </h2>' +
          ' <ol id="list-day-' + day + '" class="log-group">';
      }
      content += this.createRecentEntry(recents[i]);
    }
    this.recentsContainer.innerHTML = content;

    FixedHeader.refresh();

    this.updateContactDetails();

    var event = new Object();
    this._allViewGroupingPending = true;
    this._missedViewGroupingPending = true;
    if (this.missedFilter.classList.contains('selected')) {
      this.missedFilter.classList.remove('selected');
      event.target = this.missedFilter;
      this.filter(event);
      this.missedFilter.classList.add('selected');
      this.allFilter.classList.remove('selected');
    } else {
      this.allFilter.classList.remove('selected');
      event.target = this.allFilter;
      this.filter(event);
      this.missedFilter.classList.remove('selected');
      this.allFilter.classList.add('selected');
    }
  },

  updateContactDetails: function re_updateContactDetails() {
    var itemSelector = '.log-item:not(.hide)',
      callLogItems = document.querySelectorAll(itemSelector);
    for (var i = 0; i < callLogItems.length; i++) {
      var phoneNumber = callLogItems[i].dataset.num.trim();
      Contacts.findByNumber(phoneNumber,
        this.contactCallBack.bind(this, callLogItems[i]));
    }
  },

  contactCallBack: function re_contactCallBack(logItem, contact) {
    var contactPhoto = logItem.querySelector('.call-log-contact-photo');
    if (contact != null) {
      // Update name
      var primaryInfo = logItem.querySelector('.primary-info'),
        phoneNumber = logItem.dataset.num.trim(),
        count = logItem.dataset.count;
      primaryInfo.innerHTML = ((contact.name && contact.name != '') ?
        contact.name : _('unknown'));
      primaryInfo.innerHTML = primaryInfo.innerHTML.trim() +
        ((count > 1) ? '&nbsp;&nbsp;(' + count + ')' : '');
      if (contact.photo && contact.photo[0]) {
        var photoURL = URL.createObjectURL(contact.photo[0]);
        contactPhoto.style.backgroundImage = 'url(' + photoURL + ')';
        logItem.classList.add('contact-photo-available');
      }
      var phoneNumberAdditionalInfo = Utils.getPhoneNumberAdditionalInfo(
        phoneNumber, contact);
      var phoneNumberAdditionalInfoNode = logItem.
        querySelector('.call-additional-info');
      phoneNumberAdditionalInfoNode.textContent = phoneNumberAdditionalInfo;
      logItem.classList.add('isContact');
      logItem.dataset['contactId'] = contact.id;
    } else {
      contactPhoto.classList.add('unknownContact');
      delete logItem.dataset['contactId'];
    }
  },

  groupCallsInCallLog: function re_groupCallsInCallLog() {
    // The grouping of the calls is per day, per contact, per contact
    //  phone number type (Home, Work, Mobile, etc.) and per type of call
    //  (outgoing, incoming, missed).
    var daySelector = '.log-group',
      daysElements = document.querySelectorAll(daySelector),
      daysElementsLength = daysElements.length,
      itemSelector = '.log-item:not(.hide)',
      callLogItems, length, phoneNumber, phoneNumberType, callType,
      callCount, callDate, sameTypeCall,
      sameTypeCallAux, sameTypeCallCount;
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
          sameTypeCall = this.getMostRecentCallWithSameTypeOnSameDay(
            daysElements[dayElementsCounter], phoneNumber, phoneNumberType,
            'dialing', true, 'grouping');
        } else if (callType.indexOf('incoming-connected') != -1) {
          sameTypeCall = this.getMostRecentCallWithSameTypeOnSameDay(
            daysElements[dayElementsCounter], phoneNumber, phoneNumberType,
            'incoming-connected', false, 'grouping');
        } else {
          sameTypeCall = this.getMostRecentCallWithSameTypeOnSameDay(
            daysElements[dayElementsCounter], phoneNumber, phoneNumberType,
            'incoming', false, 'grouping');
          sameTypeCallAux = this.getMostRecentCallWithSameTypeOnSameDay(
            daysElements[dayElementsCounter], phoneNumber, phoneNumberType,
            'incoming-refused', false, 'grouping');
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
        if (sameTypeCall && (sameTypeCall != callLogItems[i])) {
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
    var primaryInfo = newerCallEl.querySelector('.primary-info'),
      callDetails = primaryInfo.textContent.trim(),
      countIndex = callDetails.indexOf('(' + count + ')');
    count += inc;
    if (countIndex != -1) {
      primaryInfo.innerHTML = callDetails.substr(0, countIndex).trim() +
        '&nbsp;&nbsp;(' + count + ')';
    } else {
      primaryInfo.innerHTML = callDetails + '&nbsp;&nbsp;(' + count + ')';
    }
    newerCallEl.dataset.count = count;
  },

  updateLatestVisit: function re_updateLatestVisit() {
    localStorage.setItem('latestCallLogVisit', Date.now());
  },

  updateHighlighted: function re_updateHighlighted() {
    var itemSelector = '.log-item.highlighted',
      items = document.querySelectorAll(itemSelector),
      itemsLength = items.length;
    for (var i = 0; i < itemsLength; i++) {
      items[i].classList.remove('highlighted');
    }
  }
};

window.addEventListener('localized', function recentsSetup() {
  window.removeEventListener('localized', recentsSetup);
    var headerSelector = '#recents-container h2';
    FixedHeader.init('#recents-container', '#fixed-container', headerSelector);
    Recents.init();
});

