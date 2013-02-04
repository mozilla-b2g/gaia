'use strict';

var Recents = {
  _: null,
  _loaded: false,

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
    return this.recentsIconClose =
      document.getElementById('recents-icon-close');
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

  get iframeContacts() {
    delete this.iframeContacts;
    return this.iframeContacts = document.
      getElementById('iframe-contacts');
  },

  get addContactActionMenu() {
    delete this.addContactActionMenu;
    return this.addContactActionMenu = document.
      getElementById('add-contact-action-menu');
  },

  get recentsEditMenu() {
    delete this.recentsEditMenu;
    return this.recentsEditMenu = document.
      getElementById('edit-mode');
  },

  get callMenuItem() {
    delete this.callMenuItem;
    return this.callMenuItem = document.
      getElementById('call-menuitem');
  },

  get createNewContactMenuItem() {
    delete this.createNewContactMenuItem;
    return this.createNewContactMenuItem = document.
      getElementById('create-new-contact-menuitem');
  },

  get addToExistingContactMenuItem() {
    delete this.addToExistingContactMenuItem;
    return this.addToExistingContactMenuItem = document.
      getElementById('add-to-existing-contact-menuitem');
  },

  get cancelActionMenuItem() {
    delete this.cancelActionMenuItem;
    return this.cancelActionMenuItem = document.
      getElementById('cancel-action-menu');
  },

  load: function re_load(callback) {
    if (this._loaded) {
      if (callback) {
        callback();
      }
      return;
    }

    this._loaded = true;

    // Time to load the external css/js
    var stylesheets = [
      '/dialer/style/commslog.css',
      '/dialer/style/fixed_header.css',
      '/shared/style/headers.css',
      '/shared/style/switches.css',
      '/shared/style/edit_mode.css',
      '/shared/style/action_menu.css'
    ];
    stylesheets.forEach(function cssIterator(url) {
      var link = document.createElement('link');
      link.rel = 'stylesheet';
      link.href = url;
      document.head.appendChild(link);
    });

    var scripts = [
      '/dialer/js/fixed_header.js',
      '/dialer/js/utils.js',
      '/dialer/js/recents_db.js',
    ];

    var scriptLoadCount = 0;
    var scriptLoaded = (function() {
      scriptLoadCount++;

      // All the scripts are now loaded
      if (scriptLoadCount === scripts.length) {
        var headerSelector = '#recents-container header';
        FixedHeader.init('#recents-container',
                         '#fixed-container', headerSelector);


        this.init();
        this.recentsView.classList.remove('hidden');
        this.addContactActionMenu.hidden = false;
        this.recentsEditMenu.hidden = false;

        if (callback) {
          callback();
        }
      }
    }).bind(this);

    scripts.forEach(function scriptIterator(url) {
      var script = document.createElement('script');
      script.src = url;
      script.onload = scriptLoaded;
      document.head.appendChild(script);
    });
  },

  init: function re_init() {
    var self = this;
    if (this.recentsFilterContainer) {
      this.recentsFilterContainer.addEventListener('click',
        function re_recentsFilterHandler(event) {
          if (document.body.classList.contains('recents-edit')) {
            self.recentsHeaderAction('recents-icon-close');
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
      this.recentsContainer.addEventListener('mousedown',
        this.mouseDown.bind(this));
      this.recentsContainer.addEventListener('mouseup',
        this.mouseUp.bind(this));
      this.recentsContainer.addEventListener('click',
        this.click.bind(this));
    }
    if (this.callMenuItem) {
      this.callMenuItem.addEventListener('click',
        this.call.bind(this));
    }
    if (this.addContactActionMenu) {
      this.addContactActionMenu.addEventListener('submit',
        this.formSubmit.bind(this));
    }
    if (this.createNewContactMenuItem) {
      this.createNewContactMenuItem.addEventListener('click',
        this.createNewContact.bind(this));
    }
    if (this.addToExistingContactMenuItem) {
      this.addToExistingContactMenuItem.addEventListener('click',
        this.addToExistingContact.bind(this));
    }
    if (this.cancelActionMenuItem) {
      this.cancelActionMenuItem.addEventListener('click',
        this.cancelActionMenu.bind(this));
    }

    // Setting up the SimplePhoneMatcher
    var conn = window.navigator.mozMobileConnection;
    if (conn && conn.voice && conn.voice.network) {
      SimplePhoneMatcher.mcc = conn.voice.network.mcc.toString();
    }

    LazyL10n.get(function localized(_) {
      self._ = _;
      self.refresh();
    });
  },

  // Refresh can be called on an unloaded Recents
  refresh: function re_refresh() {
    this.load(function loaded() {
      RecentsDBManager.init(function() {
        RecentsDBManager.get(function(recents) {
          // We need l10n to be loaded before rendering
          LazyL10n.get(function localized() {
            Recents.render(recents);
          });
        });
      });
    });
  },

  recentsHeaderAction: function re_recentsIconEditAction(event) {
    if (event) {
      switch (event.target ? event.target.id : event) {
        case 'edit-button': // Entering edit mode
          // Updating header
          this.headerEditModeText.textContent = this._('edit');
          this.deselectSelectedEntries();
          document.body.classList.toggle('recents-edit');
          this.fitPrimaryInfoToSpace();
          break;
        case 'recents-icon-close': // Exit edit mode with no deletions
          document.body.classList.toggle('recents-edit');
          this.fitPrimaryInfoToSpace();
          break;
      }
    }
  },

  filter: function re_filter(event) {
    // do nothing if selected tab is same that current
    if (event.target.parentNode.classList.contains('selected')) {
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
        this.recentsIconEdit.parentNode.removeAttribute('aria-disabled');
      } else {
        this.recentsIconEdit.parentNode.setAttribute('aria-disabled', 'true');
      }
      if (document.body.classList.contains('recents-edit')) {
        var selectedCalls = this.recentsContainer.
          querySelectorAll('.log-item:not(.hide) input:checked');
        var selectedCallsLength = selectedCalls.length;
        if (selectedCallsLength == 0) {
          this.headerEditModeText.textContent = this._('edit');
        } else {
          this.headerEditModeText.textContent = this._('edit-selected',
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
          this.recentsIconEdit.parentNode.setAttribute('aria-disabled', 'true');
        } else {
          this.recentsIconEdit.parentNode.removeAttribute('aria-disabled');
        }
        if (document.body.classList.contains('recents-edit')) {
          var selectedCalls = this.recentsContainer.
            querySelectorAll('.log-item:not(.hide) input:checked');
          var selectedCallsLength = selectedCalls.length;
          if (selectedCallsLength == 0) {
            this.headerEditModeText.textContent = this._('edit');
          } else {
            this.headerEditModeText.textContent = this._('edit-selected',
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
    this.limitVisibleEntries(100);
  },

  limitVisibleEntries: function re_limitVisibleEntries(limit) {
    var visibleCalls = this.recentsContainer.
      querySelectorAll('.log-item:not(.hide)');
    var end = visibleCalls.length;
    if (end > limit) {
      for (var i = limit; i < end; i++) {
        var visibleCallParentNode = visibleCalls[i].parentNode;
        visibleCalls[i].classList.add('hide');
        // Remove the day header if no more entries.
        if (visibleCallParentNode.getElementsByTagName('*').length === 0) {
          visibleCallParentNode.parentNode.parentNode.
            removeChild(visibleCallParentNode.parentNode);
        }
      }
    }
  },

  selectAllEntries: function re_selectAllEntries() {
    var itemSelector = '.log-item input';
    var items = document.querySelectorAll(itemSelector);
    var count = items.length;
    for (var i = 0; i < count; i++) {
      items[i].checked = true;
    }
    var itemShown = document.querySelectorAll('.log-item:not(.hide)');
    var itemsCounter = itemShown.length;
    this.headerEditModeText.textContent = this._('edit-selected',
                                            {n: itemsCounter});
    this.recentsIconDelete.classList.remove('disabled');
    this.deselectAllThreads.removeAttribute('disabled');
    this.selectAllThreads.setAttribute('disabled', 'disabled');
  },

  deselectSelectedEntries: function re_deselectSelectedEntries() {
    var itemSelector = '.log-item input';
    var items = document.querySelectorAll(itemSelector);
    var length = items.length;
    for (var i = 0; i < length; i++) {
      items[i].checked = false;
    }
    this.headerEditModeText.textContent = this._('edit');
    this.recentsIconDelete.classList.add('disabled');
    this.selectAllThreads.removeAttribute('disabled');
    this.selectAllThreads.textContent = this._('selectAll');
    this.deselectAllThreads.setAttribute('disabled', 'disabled');
  },

  executeDeletion: function re_executeDeletion() {
    var self = this;
    ConfirmDialog.show(
      null,
      this._('confirm-deletion'),
      {
        title: this._('cancel'),
        callback: function() {
          ConfirmDialog.hide();
        }
      },
      {
        title: this._('delete'),
        isDanger: true,
        callback: self.deleteSelectedRecents.bind(self)
      }
    );
  },

  deleteSelectedRecents: function re_deleteSelectedRecents() {
    var selectedEntries = this.getSelectedEntries(),
        selectedLength = selectedEntries.length,
        entriesInGroup, entriesInGroupLength;
    var itemsToDelete = [];
    for (var i = 0; i < selectedLength; i++) {
      //Selects .log-item instead the checkbox
      var parentGroup = selectedEntries[i].parentNode.parentNode;
      entriesInGroup = this.getEntriesInGroup(parentGroup);
      entriesInGroupLength = entriesInGroup.length;
      for (var j = 0; j < entriesInGroupLength; j++) {
        itemsToDelete.push(parseInt(entriesInGroup[j].dataset.date));
      }
    }
    var self = this;
    RecentsDBManager.deleteList.call(RecentsDBManager,
      itemsToDelete, function deleteCB() {
        RecentsDBManager.get(function(recents) {
          ConfirmDialog.hide();
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

  mouseDown: function re_mouseDown(event) {
    this._mouseDownX = event.screenX;
    this._mouseDownY = event.screenY;
  },

  mouseUp: function re_mouseUp(event) {
    if (Math.abs(this._mouseDownX - event.screenX) > 10 ||
      Math.abs(this._mouseDownY - event.screenY) > 10) {
      this._ignoreClickEvent = true;
    } else {
      this._ignoreClickEvent = false;
    }
  },

  click: function re_click(event) {
    if (this._ignoreClickEvent) {
      return;
    }
    var target = event.target;
    if (!target) {
      return;
    }

    if (!document.body.classList.contains('recents-edit')) {
      var contactId = null;
      var phoneNumber = target.dataset.num.trim();
      if (target.classList.contains('isContact')) {
        contactId = target.dataset.contactId;
      }
      Recents.viewOrCreate(contactId, phoneNumber);
    } else {
      //Edit mode
      if (target.classList.contains('call-log-contact-photo')) {
        event.stopPropagation();
      }
      var count = this.getSelectedEntries().length;
      if (count == 0) {
        this.headerEditModeText.textContent = this._('edit');
        this.recentsIconDelete.classList.add('disabled');
        this.deselectAllThreads.setAttribute('disabled', 'disabled');
        this.selectAllThreads.removeAttribute('disabled');
        this.selectAllThreads.textContent = this._('selectAll');
      } else {
        this.headerEditModeText.textContent = this._('edit-selected',
                                                {n: count});
        this.recentsIconDelete.classList.remove('disabled');
        this.deselectAllThreads.removeAttribute('disabled');
        var itemsShown = document.querySelectorAll('.log-item:not(.hide)');
        var itemsCounter = itemsShown.length;
        if (itemsCounter === count) {
          this.selectAllThreads.setAttribute('disabled', 'disabled');
        } else {
          this.selectAllThreads.removeAttribute('disabled');
        }
      }
    }
  },

  formSubmit: function formSubmit(event) {
    return false;
  },

  createNewContact: function re_createNewContact() {
    var src = '/contacts/index.html';
    src += '#view-contact-form?tel=' + this.newPhoneNumber;
    var timestamp = new Date().getTime();
    this.iframeContacts.src = src + '&timestamp=' + timestamp;
    window.location.hash = '#contacts-view';
    this.addContactActionMenu.classList.remove('visible');
  },

  addToExistingContact: function re_addToExistingContact() {
    var src = '/contacts/index.html';
    src += '#add-parameters?tel=' + this.newPhoneNumber;
    var timestamp = new Date().getTime();
    this.iframeContacts.src = src + '&timestamp=' + timestamp;
    window.location.hash = '#contacts-view';
    this.addContactActionMenu.classList.remove('visible');
  },

  call: function re_call() {
    if (this.newPhoneNumber) {
      this.updateLatestVisit();
      CallHandler.call(this.newPhoneNumber);
    }
    this.addContactActionMenu.classList.remove('visible');
  },

  cancelActionMenu: function re_cancelActionMenu() {
    this.addContactActionMenu.classList.remove('visible');
  },

  viewOrCreate: function re_viewOrCreate(contactId, phoneNumber) {
    var contactsIframe = document.getElementById('iframe-contacts');
    var src = '/contacts/index.html';
    if (contactId) {
      src += '#view-contact-details?id=' + contactId;
      src += '&tel=' + phoneNumber;
      // enable the function of receiving the messages posted from the iframe
      src += '&back_to_previous_tab=1';
      var timestamp = new Date().getTime();
      contactsIframe.src = src + '&timestamp=' + timestamp;
      window.location.hash = '#contacts-view';
    } else {
      this.newPhoneNumber = phoneNumber;
      this.addContactActionMenu.classList.add('visible');
    }
  },

  getSelectedEntries: function re_getSelectedGroups() {
    var itemSelector = '.log-item:not(.hide) input:checked';
    var items = document.querySelectorAll(itemSelector);
    return items;
  },

  createRecentEntry: function re_createRecentEntry(recent, highlight) {
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
      '<li class="log-item ' + highlight +
      '  " data-num="' + recent.number +
      '  " data-date="' + recent.date +
      '  " data-type="' + recent.type + '">' +
      '  <label class="call-log-selection danger">' +
      '    <input type="checkbox" />' +
      '    <span></span>' +
      '  </label>' +
      '  <aside class="pack-end">' +
      '    <img class="call-log-contact-photo" src="myimage.jpg">' +
      '  </aside>' +
      '  <a href="#">' +
      '    <aside class="icon call-type-icon ' + classes + '"></aside>' +
      '    <p class="primary-info">' +
      '      <span class="primary-info-main">' +
               (recent.number || this._('unknown')) +
      '      </span>' + '<span class="many-contacts">' +
      '      </span>' + '<span class="entry-count">' +
      '      </span>' +
      '    </p>' +
      '    <p class="secondary-info">' +
      '      <span class="call-time">' +
               Utils.prettyDate(recent.date) +
      '      </span>' +
      '      <span class="call-additional-info">' +
      '      </span>' +
      '    </p>' +
      '  </a>' +
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
      this.recentsIconEdit.parentNode.setAttribute('aria-disabled', 'true');
      this.allFilter.classList.add('selected');
      return;
    }

    this.recentsIconEdit.parentNode.removeAttribute('aria-disabled');

    var self = this;
    window.asyncStorage.getItem('latestCallLogVisit', function getItem(value) {
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
          ' <header id="header-day-' + day + '">' + Utils.headerDate(day) +
          ' </header>' +
          ' <ol id="list-day-' + day + '" class="log-group">';
        }
        var highlight = (value < recents[i].date) ? 'highlighted' : '';
        content += self.createRecentEntry(recents[i], highlight);
      }

      self.recentsContainer.innerHTML = content;

      FixedHeader.refresh();

      self.updateContactDetails();

      var event = new Object();
      self._allViewGroupingPending = true;
      self._missedViewGroupingPending = true;
      if (self.missedFilter.classList.contains('selected')) {
        self.missedFilter.classList.remove('selected');
        event.target = self.missedFilter.children[0];
        self.filter(event);
        self.missedFilter.classList.add('selected');
        self.allFilter.classList.remove('selected');
      } else {
        self.allFilter.classList.remove('selected');
        event.target = self.allFilter.children[0];
        self.filter(event);
        self.missedFilter.classList.remove('selected');
        self.allFilter.classList.add('selected');
      }
    });
  },

  updateContactDetails: function re_updateContactDetails() {
    // If we're not loaded yet, nothing to update
    if (!this._loaded) {
      return;
    }

    var itemSelector = '.log-item:not(.hide)',
      callLogItems = document.querySelectorAll(itemSelector);
    for (var i = 0; i < callLogItems.length; i++) {
      var logItem = callLogItems[i];
      var phoneNumber = logItem.dataset.num.trim();
      Contacts.findByNumber(phoneNumber,
        this.contactCallBack.bind(this, logItem));
    }
  },

  contactCallBack: function re_contactCallBack(logItem, contact, matchingTel,
    contactsWithSameNumber) {
    var contactPhoto = logItem.querySelector('.call-log-contact-photo');
    var primaryInfoMainNode = logItem.querySelector('.primary-info-main'),
        manyContactsNode = logItem.querySelector('.many-contacts'),
        phoneNumberAdditionalInfoNode =
          logItem.querySelector('.call-additional-info'),
        phoneNumber = logItem.dataset.num.trim(),
        count = logItem.dataset.count;
    if (contact !== null) {
      var primaryInfo = Utils.getPhoneNumberPrimaryInfo(
        matchingTel, contact);
      if (primaryInfo) {
        primaryInfoMainNode.textContent = primaryInfo;
      } else {
        LazyL10n.get(function (_) {
          primaryInfoMainNode.textContent = _('unknown');
        });
      }
      manyContactsNode.innerHTML = contactsWithSameNumber ?
        '&#160;' + this._('contactNameWithOthersSuffix',
          {n: contactsWithSameNumber}) : '';
      if (contact.photo && contact.photo[0]) {
        var photoURL = URL.createObjectURL(contact.photo[0]);
        contactPhoto.src = photoURL;
        logItem.classList.add('hasPhoto');
      } else {
        contactPhoto.src = '';
        logItem.classList.remove('hasPhoto');
      }
      var phoneNumberAdditionalInfo = Utils.getPhoneNumberAdditionalInfo(
        matchingTel, contact);
      phoneNumberAdditionalInfoNode.textContent = phoneNumberAdditionalInfo;
      logItem.classList.add('isContact');
      logItem.dataset['contactId'] = contact.id;
    } else {
      logItem.classList.remove('hasPhoto');
      delete logItem.dataset['contactId'];
      var isContact = logItem.classList.contains('isContact');
      if (isContact) {
        primaryInfoMainNode.textContent = phoneNumber;
        phoneNumberAdditionalInfoNode.textContent = '';
        logItem.classList.remove('isContact');
      }
    }
    var entryCountNode = logItem.querySelector('.entry-count');
    entryCountNode.innerHTML = (count > 1) ? '&#160;(' + count + ')' : '';
    this.fitPrimaryInfoToSpace(logItem);
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
    count += inc;
    var entryCountNode = newerCallEl.querySelector('.entry-count');
    entryCountNode.innerHTML = '&#160;(' + count + ')';
    newerCallEl.dataset.count = count;
  },

  updateLatestVisit: function re_updateLatestVisit() {
    window.asyncStorage.setItem('latestCallLogVisit', Date.now());
  },

  updateHighlighted: function re_updateHighlighted() {
    // No need to update if we're not loaded yet
    if (!this._loaded)
      return;

    var itemSelector = '.log-item.highlighted',
      items = document.querySelectorAll(itemSelector),
      itemsLength = items.length;
    for (var i = 0; i < itemsLength; i++) {
      items[i].classList.remove('highlighted');
    }
  },

  fitPrimaryInfoToSpace: function re_fitPrimaryInfoToSpace(logItemNode) {
    var logItemNodes;
    if (logItemNode) {
      logItemNodes = [];
      logItemNodes.push(logItemNode);
    } else {
      logItemNodes = this.recentsContainer.
        querySelectorAll('.log-item.isContact:not(.hide)');
    }
    for (var i = 0; i < logItemNodes.length; i++) {
      var primaryInfoNode = logItemNodes[i].
        querySelector('.primary-info');
      var primaryInfoNodeWidth = primaryInfoNode.clientWidth;
      var primaryInfoMainNode = logItemNodes[i].
        querySelector('.primary-info-main');
      primaryInfoMainNode.style.width = 'auto';
      var primaryInfoMainNodeCS = window.getComputedStyle(primaryInfoMainNode);
      var primaryInfoMainNodeWidth = parseInt(primaryInfoMainNodeCS.width);
      var manyContactsNode = logItemNodes[i].querySelector('.many-contacts');
      var manyContactsNodeCS = window.getComputedStyle(manyContactsNode);
      var manyContactsNodeWidth = parseInt(manyContactsNodeCS.width);
      var entryCountNode = logItemNodes[i].querySelector('.entry-count');
      var entryCountNodeCS = window.getComputedStyle(entryCountNode);
      var entryCountNodeWidth = parseInt(entryCountNodeCS.width);
      if ((primaryInfoMainNodeWidth + manyContactsNodeWidth +
          entryCountNodeWidth) > primaryInfoNodeWidth) {
        primaryInfoMainNode.style.width = (primaryInfoNodeWidth -
          manyContactsNodeWidth - entryCountNodeWidth) + 'px';
      }
    }
  }
};

