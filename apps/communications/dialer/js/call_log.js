'use strict';

var CallLog = {
  _: null,
  _groupCounter: 0,
  _initialized: false,
  _headersInterval: null,
  _empty: true,

  init: function cl_init() {
    if (this._initialized) {
      this.updateHighlight();
      this.updateHeaders();
      return;
    }

    this._initialized = true;

    var lazyFiles = [
      '/dialer/style/fixed_header.css',
      '/shared/style/switches.css',
      '/shared/style_unstable/lists.css',
      '/dialer/js/phone_action_menu.js',
      '/dialer/js/fixed_header.js',
      '/dialer/js/utils.js'
    ];
    var self = this;
    LazyLoader.load(lazyFiles, function resourcesLoaded() {
      var mainNodes = [
        'all-filter',
        'call-log-container',
        'call-log-edit-mode',
        'call-log-filter',
        'call-log-icon-close',
        'call-log-icon-edit',
        'call-log-view',
        'deselect-all-threads',
        'delete-button',
        'header-edit-mode-text',
        'missed-filter',
        'select-all-threads'
      ];

      mainNodes.forEach(function(id) {
        this[Utils.toCamelCase(id)] = document.getElementById(id);
      }, self);

      LazyL10n.get(function localized(_) {
        self._ = _;
        var headerSelector = '#call-log-container header';
        FixedHeader.init('#call-log-container',
                         '#fixed-container', headerSelector);

        self.render();

        self.callLogIconEdit.addEventListener('click',
          self.showEditMode.bind(self));
        self.callLogIconClose.addEventListener('click',
          self.hideEditMode.bind(self));
        self.missedFilter.addEventListener('click',
          self.filter.bind(self));
        self.allFilter.addEventListener('click',
          self.unfilter.bind(self));
        self.callLogContainer.addEventListener('click', self);
        self.selectAllThreads.addEventListener('click',
          self.selectAll.bind(self));
        self.deselectAllThreads.addEventListener('click',
          self.deselectAll.bind(self));
        self.deleteButton.addEventListener('click',
          self.deleteLogGroups.bind(self));
        document.addEventListener('mozvisibilitychange', function() {
          if (document.hidden) {
            self.pauseHeaders();
          } else {
            self.updateHeaders();
            self.updateHighlight();
            self.updateHeadersContinuously();
          }
        });
      });
    });
  },

  // Method for highlighting call events since last visit to call-log
  updateHighlight: function cl_updateHighlight() {
    var self = this;
    var evtName = 'latestCallLogVisit';
    window.asyncStorage.getItem(evtName, function getItem(referenceTimestamp) {
      if (referenceTimestamp) {
        var logs = self.callLogContainer.getElementsByTagName('li');
        for (var i = 0, l = logs.length; i < l; i++) {
          if (logs[i].dataset.timestamp > referenceTimestamp) {
            logs[i].classList.add('highlighted');
          } else {
            logs[i].classList.remove('highlighted');
          }
        }
      }
      window.asyncStorage.setItem(evtName, Date.now());
    });
  },

  // Method for updating the time in headers based on device time
  updateHeaders: function cl_updateHeaders() {
    var headers = this.callLogContainer.getElementsByTagName('header');
    for (var i = 0, l = headers.length; i < l; i++) {
      var current = headers[i];
      var parsedInfo = Utils.headerDate(parseInt(current.dataset.timestamp));
      if (parsedInfo !== current.textContent) {
        current.textContent = parsedInfo;
      }
    }
  },

  // Method that starts updating headers every minute, based on device time
  updateHeadersContinuously: function cl_updateHeaders() {
    var updater = this.updateHeaders.bind(this);
    this._headersInterval = setInterval(updater, 60000);
  },

  pauseHeaders: function cl_pauseHeaders() {
    clearInterval(this._headersInterval);
  },

  // Method for rendering the whole list of logs for first time,
  // getting the groups from the DB and rendering them in order.
  // We update contact information, every time a chunk
  // is rendered, focusing the update in the section we just rendered.
  render: function cl_render() {
    var self = this;

    var chunk = [];
    var prevDate;
    var startDate = new Date().getTime();
    var screenRendered = false;
    var FIRST_CHUNK_SIZE = 6;
    this._groupCounter = 0;

    CallLogDBManager.getGroupList(function logGroupsRetrieved(cursor) {
      if (!cursor.value) {
        if (chunk.length === 0) {
          self.renderEmptyCallLog();
          self.disableEditMode();
        } else {
          self.renderChunk(chunk);
          if (!screenRendered) {
            self.enableEditMode();
            PerformanceTestingHelper.dispatch('first-chunk-ready');
          }
          FixedHeader.refresh();
          self.updateHeadersContinuously();
          PerformanceTestingHelper.dispatch('call-log-ready');
        }
        return;
      }

      self._empty = false;
      var currDate = new Date(cursor.value.date);
      if (!prevDate || ((currDate - prevDate) === 0)) {
        self._groupCounter++;
        chunk.push(cursor.value);
      } else {
        if (self._groupCounter >= FIRST_CHUNK_SIZE && !screenRendered) {
          screenRendered = true;
          self.enableEditMode();
          PerformanceTestingHelper.dispatch('first-chunk-ready');
        }
        self.renderChunk(chunk);
        chunk = [cursor.value];
      }
      prevDate = currDate;
      cursor.continue();
    }, 'lastEntryDate', true, true);
  },

  renderChunk: function cl_renderChunk(chunk) {
    var callLogSection = this.createSectionForGroup(chunk[0]);
    var phoneNumbers = [];
    var logGroupContainer = callLogSection.getElementsByTagName('ol')[0];

    for (var i = 0; i < chunk.length; i++) {
      var current = chunk[i];
      var logGroupDOM = this.createGroup(current);
      logGroupContainer.appendChild(logGroupDOM);
      phoneNumbers.push(current.number);
    }

    this.callLogContainer.appendChild(callLogSection);
    this.updateListWithContactInfo(phoneNumbers, logGroupContainer);
  },

  renderEmptyCallLog: function cl_renderEmptyCallLog() {
    this.disableEditMode();
    this._empty = true;
    this.callLogContainer.innerHTML =
      '<div id="no-result-container">' +
        '<div id="no-result-message">' +
          '<p data-l10n-id="no-logs-msg-1">' +
            this._('no-logs-msg-1') +
          '</p>' +
          '<p data-l10n-id="no-logs-msg-2">' +
            this._('no-logs-msg-2') +
          '</p>' +
        '</div>' +
      '</div>';
  },

  // Method for appending a new group in the list.
  // We need to ensure where to put the group, taking into account
  // that the user might have changed date and time in his device.
  appendGroup: function cl_appendGroup(group, updateContact) {
    if (!this._initialized) {
      return;
    }

    this.enableEditMode();

    // Create element of logGroup
    var logGroupDOM = this.createGroup(group, updateContact);
    var dayIndex = group.date;
    var container = this.callLogContainer;
    var previousLogGroup = document.getElementById(group.id);

    if (previousLogGroup) {
      // We already have a group with the same id, so just remove it
      // and re-insert it in the right place
      var parent = previousLogGroup.parentNode;
      parent.removeChild(previousLogGroup);
      this.insertInSection(logGroupDOM, parent);
      return;
    }

    var groupSelector = '[data-timestamp="' + dayIndex + '"]';
    var sectionExists = container.querySelector(groupSelector);

    if (sectionExists) {
      // We found a section to place the group, so just insert it
      // in the right position.
      var section = sectionExists.getElementsByTagName('ol')[0];
      this.insertInSection(logGroupDOM, section);
      return;
    }

    // We don't have any call for that day, so creating a new section
    var callLogSection = this.createSectionForGroup(group);
    var logGroupContainer = callLogSection.getElementsByTagName('ol')[0];
    logGroupContainer.appendChild(logGroupDOM);

    var previousSections = container.getElementsByTagName('section');
    var referenceSection;
    var previousSectionsLength = previousSections.length;
    for (var i = 0; i < previousSectionsLength; i++) {
      var current = previousSections[i];
      if (dayIndex > current.dataset.timestamp) {
        referenceSection = current;
        break;
      }
    }

    if (referenceSection) {
      container.insertBefore(callLogSection, referenceSection);
    } else {
      if (this._empty) {
        container.innerHTML = '';
        this.empty = false;
      }
      container.appendChild(callLogSection);
    }

    FixedHeader.refresh();
  },

  // Method that places a log group in the right place inside a section
  insertInSection: function cl_insertInSect(group, section) {
    var groups = section.getElementsByTagName('li');
    var groupsLength = groups.length;
    var referenceGroup;
    var date = group.dataset.timestamp;
    for (var i = 0; i < groupsLength; i++) {
      var current = groups[i];
      if (parseInt(date) > parseInt(current.dataset.timestamp)) {
        referenceGroup = current;
        break;
      }
    }

    if (referenceGroup) {
      section.insertBefore(group, referenceGroup);
    } else {
      section.appendChild(group);
    }
  },

  createGroup: function cl_createGroup(group, updateContact) {
    var date = group.lastEntryDate;
    var number = group.number;
    var type = group.type;
    var status = group.status || null;
    var groupDOM = document.createElement('li');
    groupDOM.classList.add('log-item');
    groupDOM.dataset.timestamp = date;
    groupDOM.dataset.phoneNumber = number;
    groupDOM.dataset.type = type;
    groupDOM.id = group.id;

    var iconStyle = 'icon ';
    switch (type) {
      case 'dialing':
        iconStyle += 'icon-outgoing';
        break;
      case 'incoming':
        groupDOM.dataset.status = status;
        if (status === 'connected') {
          iconStyle += 'icon-incoming';
        } else {
          iconStyle += 'icon-missed';
          groupDOM.classList.add('missed-call');
        }
        break;
    }

    var label = document.createElement('label');
    label.className = 'call-log-selection danger';
    var input = document.createElement('input');
    input.setAttribute('type', 'checkbox');
    input.value = group.id;
    var span = document.createElement('span');

    label.appendChild(input);
    label.appendChild(span);

    var aside = document.createElement('aside');
    aside.className = 'pack-end';
    var img = document.createElement('img');
    img.className = 'call-log-contact-photo';

    aside.appendChild(img);

    var main = document.createElement('a');
    var icon = document.createElement('aside');
    icon.className = 'icon call-type-icon ' + iconStyle;

    var primInfo = document.createElement('p');
    primInfo.className = 'primary-info';

    var primInfoMain = document.createElement('span');
    primInfoMain.className = 'primary-info-main';
    primInfoMain.textContent = (number || this._('unknown'));

    var manyContacts = document.createElement('span');
    manyContacts.className = 'many-contacts';
    var entryCount = document.createElement('span');
    entryCount.className = 'entry-count';

    if (group.retryCount && group.retryCount > 1) {
      entryCount.innerHTML = '&#160;(' + group.retryCount + ')';
    }

    primInfo.appendChild(primInfoMain);
    primInfo.appendChild(manyContacts);
    primInfo.appendChild(entryCount);

    var secInfo = document.createElement('p');
    secInfo.className = 'secondary-info';

    var callTime = document.createElement('span');
    callTime.className = 'call-time';
    callTime.textContent = Utils.prettyDate(date) + ' ';
    var additInfo = document.createElement('span');
    additInfo.className = 'call-additional-info';

    secInfo.appendChild(callTime);
    secInfo.appendChild(additInfo);

    main.appendChild(icon);
    main.appendChild(primInfo);
    main.appendChild(secInfo);

    groupDOM.appendChild(label);
    groupDOM.appendChild(aside);
    groupDOM.appendChild(main);

    if (updateContact) {
      var params = {
        element: groupDOM,
        contact: updateContact.contact,
        contactsWithSameNumber: updateContact.contactsWithSameNumber,
        matchingTel: updateContact.matchingTel
      };
      CallLog.updateContactInfo(params);
    }

    return groupDOM;
  },

  // Method that creates a new section for placing groups
  createSectionForGroup: function cl_createSectionForGroup(group) {
    var referenceTimestamp = group.date;
    var groupContainer = document.createElement('section');
    groupContainer.dataset.timestamp = referenceTimestamp;
    var header = document.createElement('header');
    header.textContent = Utils.headerDate(referenceTimestamp);
    header.dataset.timestamp = referenceTimestamp;
    header.id = 'header-' + referenceTimestamp;
    header.dataset.update = true;
    var ol = document.createElement('ol');
    ol.classList.add('log-group');
    ol.id = 'group-container-' + referenceTimestamp;

    groupContainer.appendChild(header);
    groupContainer.appendChild(ol);

    return groupContainer;
  },

  // Updating the log or part of the log with new contacts info.
  updateListWithContactInfo: function cl_updtList(phoneNumbers, target) {
    var phoneNumber = phoneNumbers.shift();
    var self = this;
    var container = target || this.callLogContainer;
    var callback = function(contact, matchingTel, sameNum) {
      var selector = '[data-phone-number="' + phoneNumber + '"]';
      var logsToUpdate = container.querySelectorAll(selector);
      for (var j = 0, l = logsToUpdate.length; j < l; j++) {
        if (contact && contact !== null) {
          var infoToUpdate = {
            element: logsToUpdate[j],
            contact: contact,
            matchingTel: matchingTel,
            contactsWithSameNumber: sameNum
          };
        } else {
          var infoToUpdate = {
            element: logsToUpdate[j]
          };
        }

        CallLog.updateContactInfo(infoToUpdate);
      }
      if (phoneNumbers.length > 0) {
        self.updateListWithContactInfo(phoneNumbers, target);
      }
    };
    Contacts.findByNumber(phoneNumber, callback);
  },

  updateContactInfo: function cl_updateContactInfo(params) {
    var el = params.element;
    var contact = params.contact;
    if (!params.matchingTel && !el.dataset.contactId) {
      return;
    }
    var primInfoCont = el.getElementsByClassName('primary-info-main')[0];
    var numContactsCont = el.getElementsByClassName('many-contacts')[0];
    var contactPhoto = el.querySelector('.call-log-contact-photo');
    var additInfoCont = el.getElementsByClassName('call-additional-info')[0];

    if (!params.matchingTel && el.dataset.contactId) {
        primInfoCont.textContent = el.dataset.phoneNumber;
        numContactsCont.textContent = '';
        additInfoCont.textContent = '';
        contactPhoto.src = '';
        delete el.dataset.contactId;
        return;
    }
    var primaryInfo =
      Utils.getPhoneNumberPrimaryInfo(params.matchingTel, params.contact);
    if (primaryInfo) {
      primInfoCont.textContent = primaryInfo;
    } else {
      LazyL10n.get(function gotL10n(_) {
        primInfoCont.textContent = _('unknown');
      });
    }
    if (params.contactsWithSameNumber) {
      numContactsCont.innerHTML =
        '&#160;' + this._('contactNameWithOthersSuffix',
          {n: params.contactsWithSameNumber});
    } else {
      numContactsCont.textContent = '';
    }
    if (params.contact.photo && params.contact.photo[0]) {
      var image_url = params.contact.photo[0];
      var photoURL;
      var isString = (typeof image_url == 'string');
      contactPhoto.src = isString ? image_url : URL.createObjectURL(image_url);
      el.classList.add('hasPhoto');
    } else {
      contactPhoto.src = '';
    }

    var tel = params.matchingTel;
    var contact = params.contact;
    var phone = el.dataset.phoneNumber;
    var phoneNumberAdditionalInfo =
      Utils.getPhoneNumberAdditionalInfo(tel, contact, phone);

    additInfoCont.textContent = phoneNumberAdditionalInfo;
    el.dataset.contactId = params.contact.id;

    this.fitPrimaryInfoToSpace(el);
  },

  // Method that removes the contact information from every affected group.
  // We'll skip the phones inside the 'skip' param (for the use case where a
  // phone number has been removed from a contact)
  removeContactInfo: function cl_removeContactInfo(contactID, skip) {
    var selector = 'li[data-contact-id="' + contactID + '"]';
    var logs = CallLog.callLogContainer.querySelectorAll(selector);
    var phoneNumber = [];
    for (var k = 0, l = logs.length; k < l; k++) {
      var dataset = logs[k].dataset;
      if (skip.indexOf(dataset.phoneNumber) === -1) {
        phoneNumber.push(dataset.phoneNumber);
      }
    }
    if (phoneNumber.length > 0) {
      CallLog.updateListWithContactInfo(phoneNumber);
    }
  },

  enableEditMode: function cl_enableEditMode() {
    CallLog.callLogIconEdit.classList.remove('disabled');
  },

  disableEditMode: function cl_enableEditMode() {
    CallLog.callLogIconEdit.classList.add('disabled');
  },

  showEditMode: function cl_showEditMode() {
    this.headerEditModeText.textContent = this._('edit');
    document.body.classList.add('recents-edit');
  },

  hideEditMode: function cl_hideEditMode() {
    document.body.classList.remove('recents-edit');
    var cont = this.callLogContainer;
    var inputs = cont.querySelectorAll('input[type="checkbox"]');
    for (var i = 0, l = inputs.length; i < l; i++) {
      inputs[i].checked = false;
    }
  },

  // Method that handles click events in the call log.
  // In case we are in edit mode, just update the counter of selected rows.
  // Display the action menu, otherwise.
  handleEvent: function cl_handleEvent(evt) {
    if (document.body.classList.contains('recents-edit')) {
      this.updateHeaderCount();
      return;
    }
    var dataset = evt.target.dataset;
    var phoneNumber = dataset.phoneNumber;
    if (phoneNumber) {
      var contactIds = (dataset.contactId) ? dataset.contactId : null;
      var contactId = null;
      if (contactIds !== null) {
        contactId = contactIds.split(',')[0];
      }
      PhoneNumberActionMenu.show(contactId, phoneNumber);
    }
  },

  filter: function cl_filter() {
    if (document.body.classList.contains('recents-edit')) {
      return;
    }
    this.callLogContainer.classList.add('filter');
    this.allFilter.setAttribute('aria-selected', 'false');
    this.missedFilter.setAttribute('aria-selected', 'true');

    var containers = this.callLogContainer.getElementsByTagName('ol');
    for (var i = 0, l = containers.length; i < l; i++) {
      var noMissedCalls = containers[i].getElementsByClassName('missed-call');
      if (noMissedCalls.length === 0) {
        containers[i].parentNode.classList.add('groupFiltered');
      }
    }
  },

  unfilter: function cl_unfilter() {
    if (document.body.classList.contains('recents-edit')) {
      return;
    }
    this.callLogContainer.classList.remove('filter');
    this.allFilter.setAttribute('aria-selected', 'true');
    this.missedFilter.setAttribute('aria-selected', 'false');

    var hiddenContainers = document.getElementsByClassName('groupFiltered');
    for (var i = 0, l = hiddenContainers.length; i < l; i++) {
      hiddenContainers[i].classList.remove('groupFiltered');
    }
  },

  updateHeaderCount: function cl_updateHeaderCount() {
    var selector = 'input[type="checkbox"]:checked';
    var allSelector = 'input[type="checkbox"]';
    var selected = this.callLogContainer.querySelectorAll(selector).length;
    var allInputs = this.callLogContainer.querySelectorAll(allSelector).length;

    if (selected === 0) {
      this.headerEditModeText.textContent = this._('edit');
      this.selectAllThreads.removeAttribute('disabled');
      this.deselectAllThreads.setAttribute('disabled', 'disabled');
      this.deleteButton.classList.add('disabled');
      return;
    }
    this.headerEditModeText.textContent = this._('edit-selected',
                                            {n: selected});
    this.deleteButton.classList.remove('disabled');
    if (selected === allInputs) {
      this.deselectAllThreads.removeAttribute('disabled');
      this.selectAllThreads.setAttribute('disabled', 'disabled');
    } else {
      this.selectAllThreads.removeAttribute('disabled');
      this.deselectAllThreads.removeAttribute('disabled');
    }
  },

  selectAll: function cl_selectAll() {
    var selector = 'input[type="checkbox"]:not(:checked)';
    var inputs =
            this.callLogContainer.querySelectorAll(selector);
    for (var i = 0, l = inputs.length; i < l; i++) {
      inputs[i].checked = true;
    }
    this.updateHeaderCount();
  },

  deselectAll: function cl_selectAll() {
    var selector = 'input[type="checkbox"]:checked';
    var inputs =
            this.callLogContainer.querySelectorAll(selector);
    for (var i = 0, l = inputs.length; i < l; i++) {
      inputs[i].checked = false;
    }
    this.updateHeaderCount();
  },

  deleteLogGroups: function cl_deleteLogGroups() {
    var disabledSelector = 'input[type="checkbox"]:not(:checked)';
    var inputsNotSelected =
            this.callLogContainer.querySelectorAll(disabledSelector);
    if (inputsNotSelected.length === 0) {
      var self = this;
      CallLogDBManager.deleteAll(function onDeleteAll() {
        self.renderEmptyCallLog();
        document.body.classList.remove('recents-edit');
      });
      return;
    }
    var selector = 'input[type="checkbox"]:checked';
    var inputsSelected =
            this.callLogContainer.querySelectorAll(selector);
    var logGroupsToDelete = [];
    for (var i = 0, l = inputsSelected.length; i < l; i++) {
      var logGroup = inputsSelected[i].parentNode.parentNode;
      var olContainer = logGroup.parentNode;
      olContainer.removeChild(logGroup);
      if (olContainer.children.length === 0) {
        var section = olContainer.parentNode;
        this.callLogContainer.removeChild(section);
      }
      var dataset = logGroup.dataset;
      var toDelete = [
        parseInt(dataset.timestamp),
        dataset.phoneNumber,
        dataset.type
      ];
      if (dataset.status)
        toDelete.push(dataset.status);

      logGroupsToDelete.push(toDelete);
    }

    var self = this;
    CallLogDBManager.deleteGroupList(logGroupsToDelete, function() {
      document.body.classList.remove('recents-edit');
    });
  },

  // This evil method causes synchronous reflows when checking
  // width and height, but will be refactored at Bug 865079
  fitPrimaryInfoToSpace: function re_fitPrimaryInfoToSpace(logItemNode) {
    var logItemNodes;
    if (logItemNode) {
      logItemNodes = [];
      logItemNodes.push(logItemNode);
    } else {
      logItemNodes = this.recentsContainer.
        querySelectorAll('.log-item.isContact:not(.hide)');
    }
    for (var i = 0, l = logItemNodes.length; i < l; i++) {
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

navigator.mozContacts.oncontactchange = function oncontactchange(event) {
  switch (event.reason) {
    case 'create':
    case 'update':
      var phoneNumber = [];
      var options = {
        filterBy: ['id'],
        filterOp: 'equals',
        filterValue: event.contactID
      };
      var request = navigator.mozContacts.find(options);

      request.onsuccess = function contactRetrieved(e) {
        if (e.target.result && e.target.result.length) {
          var contact = e.target.result[0];
          var phoneNumbers = [];
          if (contact.tel.length) {
            var phoneNumbers = contact.tel.map(function(tel) {
              return tel.value;
            });
            CallLog.updateListWithContactInfo(phoneNumbers);
          }
          CallLog.removeContactInfo(contact.id, phoneNumbers);
        }
      };

      request.onerror = function errorHandler(e) {
        console.log('Error retrieving contact by ID ' + event.contactID);
      };
      break;

    case 'remove':
      CallLog.removeContactInfo(event.contactID);
      break;
  }
};
