'use strict';

var CallLog = {
  _: null,
  _groupCounter: 0,
  _initialized: false,
  _headersInterval: null,
  _empty: true,
  _dbupgrading: false,
  _contactCache: true,

  init: function cl_init() {
    if (this._initialized) {
      this.becameVisible();
      return;
    }

    this._initialized = true;

    var lazyFiles = [
      '/dialer/style/fixed_header.css',
      '/shared/style/confirm.css',
      '/shared/style/switches.css',
      '/shared/style/lists.css',
      '/contacts/js/utilities/confirm.js',
      '/dialer/js/phone_action_menu.js',
      '/dialer/js/fixed_header.js',
      '/dialer/js/utils.js'
    ];
    var self = this;

    // Get the latest contact cache revision and the actual Contacts API
    // db revision. If both values differ, we need to update the contact cache
    // and its revision and directly query the Contacts API to render the
    // appropriate information while the cache is being rebuilt.
    window.asyncStorage.getItem('contactCacheRevision',
                                function onItem(cacheRevision) {
      Contacts.getRevision(function(contactsRevision) {
        // We don't need to sync if this is the first time that we use the call
        // log.
        if (!cacheRevision || cacheRevision > contactsRevision) {
          window.asyncStorage.setItem('contactCacheRevision',
                                      contactsRevision);
          return;
        }

        if (self._contactCache = (cacheRevision >= contactsRevision)) {
          return;
        }

        CallLogDBManager.invalidateContactsCache(function(error) {
          if (!error) {
            self._contactCache = true;
          }
        });
      });
    });

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
        'select-all-threads',
        'call-log-upgrading',
        'call-log-upgrade-progress',
        'call-log-upgrade-percent'
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
        document.addEventListener('visibilitychange', function() {
          if (document.hidden) {
            self.pauseHeaders();
          } else {
            self.becameVisible();
            self.updateHeadersContinuously();
          }
        });
      });
    });

    // Listen for database upgrade events.
    CallLogDBManager.onupgradeneeded = function onupgradeneeded() {
      // Show a progress bar letting the user know that the database is being
      // upgraded.
      self.showUpgrading();
      self._dbupgrading = true;
    };

    CallLogDBManager.onupgradeprogress = function onupgradeprogress(progress) {
      self.updateUpgradeProgress(progress);
    };

    CallLogDBManager.onupgradedone = function onupgradedone() {
      self.hideUpgrading();
      self._dbupgrading = false;
      self.render();
    };
  },

  // Helper to update UI and clean notifications when we got visibility
  becameVisible: function cl_becameVisible() {
    this.updateHeaders();
    this.updateHighlight();
    this.cleanNotifications();
  },

  // Method for highlighting call events since last visit to call-log
  updateHighlight: function cl_updateHighlight(target) {
    var self = this;
    var evtName = 'latestCallLogVisit';
    var container = target || this.callLogContainer;
    window.asyncStorage.getItem(evtName, function getItem(referenceTimestamp) {
      if (referenceTimestamp) {
        var logs = container.getElementsByTagName('li');
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
        if (self._dbupgrading) {
          return;
        }
        if (chunk.length === 0) {
          self.renderEmptyCallLog();
          self.disableEditMode();
        } else {
          self.renderChunk(chunk);
          if (!screenRendered) {
            PerformanceTestingHelper.dispatch('first-chunk-ready');
          }
          self.enableEditMode();
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

    this.updateHighlight(callLogSection);
    this.callLogContainer.appendChild(callLogSection);

    // If the contacts cache is not valid, we retrieve the contacts information
    // directly from the contacts API and update the DOM accordingly.
    if (!this._contactCache) {
      this.updateListWithContactInfo(null, null, phoneNumbers,
                                     logGroupContainer);
    }
  },

  renderEmptyCallLog: function cl_renderEmptyCallLog(isEmptyMissedCallsGroup) {
    this.disableEditMode();
    // If rendering the empty call log for all calls (i.e. the
    // isEmptyMissedCallsGroup not set), set the _empty parameter to true
    if (!isEmptyMissedCallsGroup)
      this._empty = true;

    var noResultContainer = document.getElementById('no-result-container');
    noResultContainer.hidden = false;
    // Get pointers to the empty call log messages
    var allCallsMsg1 = document.getElementById('no-result-msg1');
    var allCallsMsg2 = document.getElementById('no-result-msg2');
    var noMissedCallsMsg = document.getElementById('no-result-msg3');
    // Set the visibility of the appropriate messages
    allCallsMsg1.hidden = isEmptyMissedCallsGroup || false;
    allCallsMsg2.hidden = isEmptyMissedCallsGroup || false;
    noMissedCallsMsg.hidden = !isEmptyMissedCallsGroup;
    // If the whole call log is cleared, remove any stale call log nodes from
    // the call log container
    if (!isEmptyMissedCallsGroup) {
      var noResultContainerClone = noResultContainer.cloneNode(true);
      this.callLogContainer.innerHTML = '';
      this.callLogContainer.appendChild(noResultContainerClone);
    }
  },

  // Method for appending a new group in the list.
  // We need to ensure where to put the group, taking into account
  // that the user might have changed date and time in his device.
  appendGroup: function cl_appendGroup(group) {
    if (!this._initialized) {
      return;
    }

    // Switch to all calls tab to avoid erroneous call filtering
    this.unfilter();

    this.enableEditMode();

    // Create element of logGroup
    var logGroupDOM = this.createGroup(group);
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
        // Create a copy of the empty call log message div in order to add it
        // back in the empty container
        var noResultContainer =
            document.getElementById('no-result-container').cloneNode(true);
        container.innerHTML = '';
        noResultContainer.hidden = true;
        container.appendChild(noResultContainer);
        this._empty = false;
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

  // Method that generates the markup for each of the rows in the call log.
  // Example:
  // <li data-contact-id="4bfa5f07c5584d48a1af7931b976a223"
  //  id="1369695600000-6136112351-dialing" data-type="dialing"
  //  data-phone-number="6136112351" data-timestamp="1369731559902"
  //  class="log-item">
  //    <label class="call-log-selection danger">
  //      <input value="1369695600000-6136112351-dialing" type="checkbox">
  //      <span></span>
  //    </label>
  //    <aside class="pack-end">
  //      <img src="" class="call-log-contact-photo">
  //    </aside>
  //    <a>
  //      <aside class="icon call-type-icon icon icon-outgoing">
  //      </aside>
  //      <p class="primary-info">
  //        <span class="primary-info-main">David R. Chichester</span>
  //      </p>
  //      <p class="call-additional-info">Mobile, O2</p>
  //      <p>
  //        <span class="call-time">9:59 AM </span>
  //        <span class="retry-count">(1)</span>
  //      </p>
  //    </a>
  // </li>
  createGroup: function cl_createGroup(group) {
    var date = group.lastEntryDate;
    var number = group.number;
    var type = group.type;
    var emergency = group.emergency;
    var voicemail = group.voicemail;
    var status = group.status || '';
    var contact = group.contact;
    var groupDOM = document.createElement('li');
    groupDOM.classList.add('log-item');
    groupDOM.dataset.timestamp = date;
    groupDOM.dataset.phoneNumber = number;
    groupDOM.dataset.type = type;
    if (contact && contact.id) {
      groupDOM.dataset.contactId = contact.id;
    }
    groupDOM.id = group.id;

    var iconStyle = 'icon ';
    switch (type) {
      case 'dialing':
      case 'alerting':
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
    label.className = 'pack-checkbox call-log-selection danger';
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
    if (contact && contact.photo) {
      img.src = typeof contact.photo == 'string' ? contact.photo :
                URL.createObjectURL(contact.photo);
      groupDOM.classList.add('hasPhoto');
    }

    aside.appendChild(img);

    var main = document.createElement('a');
    var icon = document.createElement('aside');
    icon.className = 'icon call-type-icon ' + iconStyle;

    var primInfo = document.createElement('p');
    primInfo.className = 'primary-info';

    var primInfoMain = document.createElement('span');
    primInfoMain.className = 'primary-info-main';
    if (contact && contact.primaryInfo) {
      primInfoMain.textContent = contact.primaryInfo;
    } else {
      primInfoMain.textContent = number || this._('withheld-number');
    }

    primInfo.appendChild(primInfoMain);

    var phoneNumberAdditionalInfo = '';
    var phoneNumberTypeLocalized = '';
    if (contact && contact.matchingTel) {
      phoneNumberAdditionalInfo =
        Utils.getPhoneNumberAdditionalInfo(contact.matchingTel);
    } else if (voicemail || emergency) {
      phoneNumberAdditionalInfo = number;
      phoneNumberTypeLocalized =
        voicemail ? this._('voiceMail') :
          (emergency ? this._('emergencyNumber') : '');
    }

    var addInfo;
    if (phoneNumberAdditionalInfo && phoneNumberAdditionalInfo.length) {
      addInfo = document.createElement('p');
      addInfo.className = 'call-additional-info';
      addInfo.textContent = phoneNumberAdditionalInfo;
    }

    var thirdInfo = document.createElement('p');
    var callTime = document.createElement('span');
    callTime.className = 'call-time';
    callTime.textContent = Utils.prettyDate(date) + ' ';
    var retryCount = document.createElement('span');
    retryCount.className = 'retry-count';

    if (group.retryCount && group.retryCount > 1) {
      retryCount.textContent = '(' + group.retryCount + ')';
    }

    thirdInfo.appendChild(callTime);
    thirdInfo.appendChild(retryCount);

    main.appendChild(icon);
    main.appendChild(primInfo);
    if (addInfo) {
      main.appendChild(addInfo);
    }
    main.appendChild(thirdInfo);

    if (addInfo && phoneNumberTypeLocalized &&
        phoneNumberTypeLocalized.length) {
      primInfoMain.textContent = phoneNumberTypeLocalized;
      var primElem = primInfoMain.parentNode;
      var parent = primElem.parentNode;
      parent.insertBefore(addInfo, primElem.nextElementSibling);
    }

    groupDOM.appendChild(label);
    groupDOM.appendChild(aside);
    groupDOM.appendChild(main);

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

  enableEditMode: function cl_enableEditMode() {
    CallLog.callLogIconEdit.classList.remove('disabled');
  },

  disableEditMode: function cl_enableEditMode() {
    CallLog.callLogIconEdit.classList.add('disabled');
  },

  showEditMode: function cl_showEditMode() {
    this.headerEditModeText.textContent = this._('edit');
    this.deleteButton.classList.add('disabled');
    this.selectAllThreads.removeAttribute('disabled');
    this.selectAllThreads.textContent = this._('selectAll');
    this.deselectAllThreads.setAttribute('disabled', 'disabled');
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

  showUpgrading: function cl_showUpgrading() {
    this.callLogUpgrading.classList.remove('hide');
  },

  hideUpgrading: function cl_hideUpgrading() {
    this.callLogUpgrading.classList.add('hide');
  },

  updateUpgradeProgress: function cl_updateUpgradeProgress(progress) {
    this.callLogUpgradeProgress.setAttribute('value', progress);
    this.callLogUpgradePercent.textContent = progress + '%';
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
      this.hideEditMode();
    }

    this.callLogContainer.classList.add('filter');
    this.allFilter.setAttribute('aria-selected', 'false');
    this.missedFilter.setAttribute('aria-selected', 'true');

    var containers = this.callLogContainer.getElementsByTagName('ol');
    var totalMissedCalls = 0;
    for (var i = 0, l = containers.length; i < l; i++) {
      var noMissedCalls = containers[i].getElementsByClassName('missed-call');
      if (noMissedCalls.length === 0) {
        containers[i].parentNode.classList.add('groupFiltered');
      }
      totalMissedCalls += noMissedCalls.length;
    }
    // If there are no missed calls to display, show appropriate empty call log,
    // otherwise hide the empty call log message and enable edit mode
    if (totalMissedCalls === 0) {
      this.renderEmptyCallLog(true);
    } else {
      var noResultContainer = document.getElementById('no-result-container');
      noResultContainer.hidden = true;
      this.enableEditMode();
    }
  },

  unfilter: function cl_unfilter() {
    if (document.body.classList.contains('recents-edit')) {
      this.hideEditMode();
    }

    // If the call log is empty display the appropriate message, otherwise hide
    // the empty call log message and enable edit mode
    if (this._empty) {
      this.renderEmptyCallLog();
    } else {
      var noResultContainer = document.getElementById('no-result-container');
      noResultContainer.hidden = true;
      this.enableEditMode();
    }

    this.callLogContainer.classList.remove('filter');
    this.allFilter.setAttribute('aria-selected', 'true');
    this.missedFilter.setAttribute('aria-selected', 'false');

    var hiddenContainers = document.getElementsByClassName('groupFiltered');
    // hiddenContainers is a live list, so let's iterate on the list in the
    // reverse order.
    for (var i = (hiddenContainers.length - 1); i >= 0; i--) {
      hiddenContainers[i].classList.remove('groupFiltered');
    }
  },

  updateHeaderCount: function cl_updateHeaderCount() {
    var selector = this.callLogContainer.classList.contains('filter') ?
      'li.missed-call input[type="checkbox"]:checked' :
      'input[type="checkbox"]:checked';
    var allSelector = this.callLogContainer.classList.contains('filter') ?
      'li.missed-call input[type="checkbox"]' :
      'input[type="checkbox"]';
    var selected = this.callLogContainer.querySelectorAll(selector).length;
    var allInputs = this.callLogContainer.querySelectorAll(allSelector).length;

    if (selected === 0) {
      this.headerEditModeText.textContent = this._('edit');
      this.selectAllThreads.removeAttribute('disabled');
      this.selectAllThreads.textContent = this._('selectAll');
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
      this.selectAllThreads.textContent = this._('selectAll');
      this.deselectAllThreads.removeAttribute('disabled');
    }
  },

  selectAll: function cl_selectAll() {
    var selector = this.callLogContainer.classList.contains('filter') ?
      'li.missed-call input[type="checkbox"]:not(:checked)' :
      'input[type="checkbox"]:not(:checked)';
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
    var selector = 'input[type="checkbox"]:checked';
    var inputsSelected =
          this.callLogContainer.querySelectorAll(selector);

    var self = this;
    var msg = this._('delete-n-log?',
      {n: inputsSelected.length});
    var yesObject = {
      title: this._('delete'),
      isDanger: true,
      callback: function deleteLogGroup() {

        ConfirmDialog.hide();
        var disabledSelector = 'input[type="checkbox"]:not(:checked)';
        var inputsNotSelected =
            self.callLogContainer.querySelectorAll(disabledSelector);

        if (inputsNotSelected.length === 0) {
          CallLogDBManager.deleteAll(function onDeleteAll() {
            self.renderEmptyCallLog();
            document.body.classList.remove('recents-edit');
          });
          return;
        }
        var logGroupsToDelete = [];
        for (var i = 0, l = inputsSelected.length; i < l; i++) {
          var logGroup = inputsSelected[i].parentNode.parentNode;
          var olContainer = logGroup.parentNode;
          olContainer.removeChild(logGroup);
          if (olContainer.children.length === 0) {
            var section = olContainer.parentNode;
            self.callLogContainer.removeChild(section);
          }
          var dataset = logGroup.dataset;
          var toDelete = {
            date: parseInt(dataset.timestamp),
            number: dataset.phoneNumber === null ? '' : dataset.phoneNumber,
            type: dataset.type
          };
          if (dataset.status) {
            toDelete.status = dataset.status;
          }
          logGroupsToDelete.push(toDelete);
        }

        CallLogDBManager.deleteGroupList(logGroupsToDelete, function() {
          document.body.classList.remove('recents-edit');
        });
      }
    };

    var noObject = {
      title: this._('cancel'),
      callback: function onCancel() {
        ConfirmDialog.hide();
      }
    };


    ConfirmDialog.show(null, msg, noObject, yesObject);
  },


  /**************************
   * Contacts related methods.
   **************************/

  // We need _updateContact and _removeContact aux functions to keep the
  // correct references to the log DOM element.
  _updateContact: function _updateContact(log, phoneNumber, updateDb) {
    var self = this;
    Contacts.findByNumber(phoneNumber,
                          function(contact, matchingTel) {
      if (!contact || !matchingTel) {
        // Remove contact info.
        if (self._contactCache && updateDb) {
          var group = self._getGroupFromLog(log);
          if (!group) {
            return;
          }

          CallLogDBManager.removeGroupContactInfo(null, group,
                                                  function(result) {
            self.updateContactInfo(log);
          });
        } else {
          self.updateContactInfo(log);
        }
      } else {
        // Update contact info.
        if (self._contactCache && updateDb) {
          CallLogDBManager.updateGroupContactInfo(contact, matchingTel,
                                                  function(result) {
            if (typeof result === 'number' && result > 0) {
              self.updateContactInfo(log, contact, matchingTel);
            }
          });
        } else {
          self.updateContactInfo(log, contact, matchingTel);
        }
      }
    });
  },

  _removeContact: function _removeContact(log, contactId, updateDb) {
    var self = this;
    // If the cache is valid, we also need to remove the contact from the
    // cache
    if (self._contactCache && updateDb) {
      CallLogDBManager.removeGroupContactInfo(contactId, null,
                                              function(result) {
        if (typeof result === 'number' && result > 0) {
          self.updateContactInfo(log);
        }
      });
    } else {
      self.updateContactInfo(log);
    }
  },

  /**
   * Updates the whole list of groups or part of it with the appropriate
   * contact information.
   *
   * This function will be triggered after receiving a 'oncontactchange' event
   * with 'create', 'remove' or 'update' reasons or during the initial rendering
   * for each chunk of data *only* if we detect that the contacts cache is not
   * valid.
   *
   * param reason
   *        String containing the reason of the 'oncontactchange' event or null
   *        if the function was triggered because of an invalid contacts cache.
   * param contactId
   *        Contact identifier if any. Only 'oncontactchange' events with
   *        'update' or 'remove' reasons will provide a contactId parameter.
   * param phoneNumbers
   *        Array of phoneNumbers associated with a contact. Only
   *        'oncontactchange' events with 'update' or 'add' reasons will
   *        provide this paramater.
   * param target
   *        DOM element to be updated. We default to the whole log if no
   *        'target' param is provided.
   */
  updateListWithContactInfo: function cl_updateList(reason, contactId,
                                                    phoneNumbers, target) {
    var container = target || this.callLogContainer;

    // Get the list of logs to be updated.
    var logs = [];
    switch (reason) {
      case 'remove':
        logs = container.querySelectorAll('li[data-contact-id="' + contactId +
                                          '"]');
        break;
      case 'create':
      case 'update':
      default:
        logs = container.querySelectorAll('.log-item');
        break;
    }

    for (var i = 0, l = logs.length; i < l; i++) {
      var log = logs[i];
      var logInfo = log.dataset;

      if (!reason ||
          (phoneNumbers && phoneNumbers.indexOf(logInfo.phoneNumber) > -1)) {
        this._updateContact(log, logInfo.phoneNumber, i == 0);
      } else if (logInfo.contactId && (logInfo.contactId === contactId)) {
        this._removeContact(log, contactId, i == 0);
      }
    }
  },

  /**
   * Visually update the contact information of a group in the DOM.
   *
   * param element
   *        DOM element containing the group information.
   * param contact
   *        Object containing the contact information associated to the group
   *        of calls.
   * param matchingTel
   *        Object containing the phone number associated with the group of
   *        calls. It contains 'type', 'carrier' and 'value' parameters.
   *
   */
  updateContactInfo: function cl_updateContactInfo(element, contact,
                                                   matchingTel) {
    var primInfoCont = element.getElementsByClassName('primary-info-main')[0];
    var contactPhoto = element.querySelector('.call-log-contact-photo');
    var addInfo = element.getElementsByClassName('call-additional-info');
    var addInfoCont;
    if (addInfo && addInfo[0]) {
      addInfoCont = addInfo[0];
    } else {
      addInfoCont = document.createElement('p');
      addInfoCont.className = 'call-additional-info';
      var primElem = primInfoCont.parentNode;
      var parent = primElem.parentNode;
      parent.insertBefore(addInfoCont, primElem.nextElementSibling);
    }

    if (!matchingTel) {
      if (element.dataset.contactId) {
        // Remove contact info.
        primInfoCont.textContent = element.dataset.phoneNumber;
        addInfoCont.textContent = '';
        contactPhoto.src = '';
        element.classList.remove('hasPhoto');
        delete element.dataset.contactId;
      }
      return;
    }

    var primaryInfo =
      Utils.getPhoneNumberPrimaryInfo(matchingTel, contact);
    if (primaryInfo) {
      primInfoCont.textContent = primaryInfo;
    }

    if (contact && contact.photo && contact.photo[0]) {
      var image_url = contact.photo[0];
      var photoURL;
      var isString = (typeof image_url == 'string');
      contactPhoto.src = isString ? image_url : URL.createObjectURL(image_url);
      element.classList.add('hasPhoto');
    } else {
      contactPhoto.src = '';
      element.classList.remove('hasPhoto');
    }

    var phoneNumberAdditionalInfo =
      Utils.getPhoneNumberAdditionalInfo(matchingTel);
    if (phoneNumberAdditionalInfo && phoneNumberAdditionalInfo.length) {
      addInfoCont.textContent = phoneNumberAdditionalInfo;
    }

    if (contact) {
      element.dataset.contactId = contact.id;
    }
  },

  cleanNotifications: function cl_cleanNotifcations() {
    // On startup of call log, we clear all dialer notification
    Notification.get()
      .then(
        function onSuccess(notifications) {
          for (var i = 0; i < notifications.length; i++) {
            notifications[i].close();
          }
        },
        function onError(reason) {
          console.debug('Call log Notification.get() promise error: ' + reason);
        }
      );
  },

  _getGroupFromLog: function cl_getGroupFromLog(log) {
    if (!log) {
      return;
    }
    var data = log.dataset;
    if (!data || !data.id) {
      return;
    }
    var groupId = data.id.split('-');
    var group = {
      date: groupId[0],
      number: groupId[1],
      type: groupId[2]
    };
    if (data.status) {
      group.status = data.status;
    }
    return group;
  }
};

navigator.mozContacts.oncontactchange = function oncontactchange(event) {
  function contactChanged(contact, reason) {
    var phoneNumbers = [];
    if (contact.tel && contact.tel.length) {
      var phoneNumbers = contact.tel.map(function(tel) {
        return tel.value;
      });
    }
    switch (reason) {
      case 'create':
        CallLog.updateListWithContactInfo('create', null, phoneNumbers);
        break;
      case 'update':
        CallLog.updateListWithContactInfo('update', event.contactID,
                                          phoneNumbers);
        break;
    }
  }

  var reason = event.reason;
  var options = {
    filterBy: ['id'],
    filterOp: 'equals',
    filterValue: event.contactID
  };

  if (reason === 'remove') {
    CallLog.updateListWithContactInfo('remove', event.contactID);
    return;
  }

  var request = navigator.mozContacts.find(options);
  request.onsuccess = function contactRetrieved(e) {
    if (!e.target.result || e.target.result.length === 0) {
      console.warn('Call log: No Contact Found: ', event.contactID);
      return;
    }

    var contact = e.target.result[0];
    if (!fb.isFbContact(contact)) {
       contactChanged(contact, reason);
       return;
    }

    var fbReq = fb.getData(contact);
    fbReq.onsuccess = function fbContactSuccess() {
      contactChanged(fbReq.result, reason);
    };
    fbReq.onerror = function fbContactError() {
      console.error('Error while querying FB: ', fbReq.error.name);
      contactChanged(contact, reason);
    };
  };

  request.onerror = function errorHandler(e) {
    console.error('Error retrieving contact by ID ' + event.contactID);
  };
};
