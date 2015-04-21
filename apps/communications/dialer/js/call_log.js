/* globals Contacts, CallLogDBManager, LazyLoader,
           Utils, StickyHeader, KeypadManager, SimSettingsHelper,
           CallHandler, AccessibilityHelper,
           ConfirmDialog, Notification, fb, CallGroupMenu */

'use strict';

var CallLog = {
  _initialized: false,
  _headersInterval: null,
  _empty: true,
  _dbupgrading: false,
  _contactCache: false,

  init: function cl_init() {
    if (this._initialized) {
      this.becameVisible();
      return;
    }

    window.performance.mark('callLogStart');

    this._initialized = true;

    var lazyFiles = [
      '/shared/style/confirm.css',
      '/shared/style/switches.css',
      '/shared/style/lists.css',
      '/shared/js/confirm.js',
      '/shared/js/dialer/utils.js',
      '/shared/js/sticky_header.js',
      '/shared/js/sim_settings_helper.js',
      '/shared/js/date_time_helper.js'
    ];
    var self = this;

    var validContactsCachePromise = this._validateContactsCache();

    LazyLoader.load(lazyFiles, function resourcesLoaded() {
      var mainNodes = [
        'all-filter',
        'call-log-container',
        'call-log-edit-mode',
        'call-log-filter',
        'call-log-icon-edit',
        'call-log-view',
        'deselect-all-threads',
        'delete-button',
        'edit-mode-header',
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

      var dualSim = navigator.mozIccManager.iccIds.length > 1;
      self.callLogContainer.classList.toggle('dual-sim', dualSim);

      validContactsCachePromise.then(function() {
        self.render();

        window.addEventListener('timeformatchange',
          self._updateCallTimes.bind(self));
        self.callLogIconEdit.addEventListener('click',
          self.showEditMode.bind(self));
        self.editModeHeader.addEventListener('action',
          self.hideEditMode.bind(self));
        self.missedFilter.addEventListener('click',
          self.filter.bind(self));
        self.allFilter.addEventListener('click',
          self.unfilter.bind(self));
        self.callLogContainer.addEventListener('click', self);
        self.callLogContainer.addEventListener('contextmenu', self);
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
            self.updateHeadersContinuously();
            if (window.location.hash === '#call-log-view') {
              self.becameVisible();
            }
          }
        });

        self.sticky = new StickyHeader(self.callLogContainer,
                                       document.getElementById('sticky'));

        self.becameVisible();
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

  /**
   * Returns a promise that is fullfilled once the contact cache has been
   * validated. Note that the contents of the contact cache may still be stale
   * after the promise is fullfilled. This only guarantees that
   * this._contactCache contains a valid value.
   *
   * @return {Promise} A promise that is fullfilled once we've validated the
   *                   contact cache.
   */
  _validateContactsCache: function cl_validateContactsCache() {
    var self = this;

    return new Promise(function(resolve, reject) {
      /* Get the latest contact cache revision and the actual Contacts API
       * db revision. If both values differ, we need to update the contact cache
       * and its revision and directly query the Contacts API to render the
       * appropriate information while the cache is being rebuilt. */
      window.asyncStorage.getItem('contactCacheRevision',
      function onItem(cacheRevision) {
        Contacts.getRevision(function(contactsRevision) {
          /* We don't need to sync if this is the first time that we use the
           * call log. */
          if (!cacheRevision || cacheRevision > contactsRevision) {
            window.asyncStorage.setItem('contactCacheRevision',
                                        contactsRevision);
            self._contactCache = true;
            resolve();
            return;
          }

          self._contactCache = (cacheRevision >= contactsRevision);
          if (self._contactCache) {
            resolve();
            return;
          }

          CallLogDBManager.invalidateContactsCache(function(error) {
            if (!error) {
              self._contactCache = true;
              resolve();
            }
          });
        });
      });
    });
  },

  _updateCallTimes: function cl_updateCallTimes() {
    var logItemElts = this.callLogContainer.querySelectorAll('.log-item');
    for (var i = 0; i < logItemElts.length; i++) {
      var logItemElt = logItemElts[i];
      var timestamp = logItemElt.getAttribute('data-timestamp');
      var formattedTime = Utils.prettyDate(parseInt(timestamp, 10)) + ' ';
      var callTimeElt = logItemElt.querySelector('.call-time');
      callTimeElt.textContent = formattedTime;
    }
  },

  // Helper to update UI and clean notifications when we got visibility
  becameVisible: function cl_becameVisible() {
    this.updateHeaders();
    this.cleanNotifications();
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

    var daysToRender = [];
    var chunk = [];
    var prevDate;
    var screenRendered = false;
    var MAX_GROUPS_FOR_FIRST_RENDER = 8;
    var MAX_GROUPS_TO_BATCH_RENDER = 100;
    var batchGroupCounter = 0;

    CallLogDBManager.getGroupList(function logGroupsRetrieved(cursor) {
      if (!cursor.value) {
        if (self._dbupgrading) {
          return;
        }
        if (chunk.length === 0) {
          self.renderEmptyCallLog();
          self.disableEditModeButton();
        } else {
          daysToRender.push(chunk);
          self.renderSeveralDays(daysToRender);
          if (!screenRendered) {
            window.performance.mark('firstChunkReady');
          }
          self.enableEditModeButton();
          self.sticky.refresh();
          self.updateHeadersContinuously();
        }
        window.performance.measure('callLogReady', 'callLogStart');
        return;
      }

      self._empty = false;
      var currDate = new Date(cursor.value.date);
      batchGroupCounter++;
      if (!prevDate || (currDate.getTime() == prevDate.getTime())) {
        chunk.push(cursor.value);
      } else {
        daysToRender.push(chunk);
        chunk = [cursor.value];

        var renderNow = false;
        if (batchGroupCounter >= MAX_GROUPS_FOR_FIRST_RENDER &&
            !screenRendered) {
          renderNow = true;
          screenRendered = true;
          window.performance.mark('firstChunkReady');
        } else if (batchGroupCounter >= MAX_GROUPS_TO_BATCH_RENDER) {
          renderNow = true;
        }
        if (renderNow) {
          self.renderSeveralDays(daysToRender);
          daysToRender = [];
          batchGroupCounter = 0;
        }
      }
      prevDate = currDate;
      cursor.continue();
    }, 'lastEntryDate', true, true);
  },

  renderSeveralDays: function cl_renderSeveralDays(chunks) {
    for (var i = 0, l = chunks.length; i < l; i++) {
      this.renderChunk(chunks[i]);
    }
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

    // If the contacts cache is not valid, we retrieve the contacts information
    // directly from the contacts API and update the DOM accordingly.
    if (!this._contactCache) {
      this.updateListWithContactInfo(null, null, phoneNumbers,
                                     logGroupContainer);
    }
  },

  renderEmptyCallLog: function cl_renderEmptyCallLog(isEmptyMissedCallsGroup) {
    this.disableEditModeButton();
    // If rendering the empty call log for all calls (i.e. the
    // isEmptyMissedCallsGroup not set), set the _empty parameter to true
    if (!isEmptyMissedCallsGroup) {
      this._empty = true;
    }

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

    this.enableEditModeButton();

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
      return logGroupDOM;
    }

    var groupSelector = '[data-timestamp="' + dayIndex + '"]';
    var sectionExists = container.querySelector(groupSelector);

    if (sectionExists) {
      // We found a section to place the group, so just insert it
      // in the right position.
      var section = sectionExists.getElementsByTagName('ol')[0];
      this.insertInSection(logGroupDOM, section);
      return logGroupDOM;
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

    this.sticky.refresh();

    return logGroupDOM;
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
  //  class="log-item" role="option" aria-selected="false">
  //    <label class="pack-checkbox call-log-selection danger"
  //     aria-hidden="true">
  //      <input value="1369695600000-6136112351-dialing" type="checkbox">
  //      <span></span>
  //    </label>
  //    <a role="presentation">
  //      <aside class="icon call-type-icon icon icon-outgoing">
  //      </aside>
  //      <p class="primary-info">
  //        <span class="primary-info-main">David R. Chichester</span>
  //        <span class="retry-count">(1)</span>
  //      </p>
  //      <p aria-hidden="true" class="additional-info">
  //        <span class="type-carrier">Mobile, O2</span>
  //        <span class="call-time">9:59 AM</span>
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
    groupDOM.setAttribute('role', 'option');
    groupDOM.setAttribute('aria-selected', false);
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

    if (typeof group.serviceId !== 'undefined') {
      var serviceClass =
        (parseInt(group.serviceId) === 0) ? 'first-sim' : 'second-sim';
      iconStyle += ' ' + serviceClass;
    }

    var label = document.createElement('label');
    label.setAttribute('aria-hidden', true);
    label.className = 'pack-checkbox call-log-selection danger';
    var input = document.createElement('input');
    input.setAttribute('type', 'checkbox');
    input.value = group.id;
    var span = document.createElement('span');

    label.appendChild(input);
    label.appendChild(span);

    var main = document.createElement('a');
    main.setAttribute('role', 'presentation');
    var icon = document.createElement('aside');
    icon.className = 'icon call-type-icon ' + iconStyle;

    var primInfo = document.createElement('p');
    primInfo.className = 'primary-info';

    var primInfoMain = document.createElement('span');
    primInfoMain.className = 'primary-info-main';
    var bdi = document.createElement('bdi');
    if (contact && contact.primaryInfo) {
      bdi.textContent = contact.primaryInfo;
    } else {
      if (number) {
        bdi.textContent = number;
      } else {
        bdi.setAttribute('data-l10n-id', 'withheld-number');
      }
    }
    primInfoMain.appendChild(bdi);
    primInfo.appendChild(primInfoMain);

    if (group.retryCount && group.retryCount > 1) {
      var retryCount = document.createElement('span');
      retryCount.className = 'retry-count';
      retryCount.textContent = '(' + group.retryCount + ')';
      primInfo.appendChild(retryCount);
    }

    var phoneNumberAdditionalInfo = '';
    var phoneNumberTypeL10nId = null;
    if (contact && contact.matchingTel) {
      phoneNumberAdditionalInfo =
        Utils.getPhoneNumberAdditionalInfo(contact.matchingTel);
    } else if (voicemail || emergency) {
      phoneNumberAdditionalInfo = number;
      phoneNumberTypeL10nId =
        voicemail ? 'voiceMail' :
          (emergency ? 'emergencyNumber' : null);
    } else {
      phoneNumberAdditionalInfo = {id: 'unknown'};
    }

    var addInfo = document.createElement('p');
    addInfo.className = 'additional-info';
    addInfo.setAttribute('aria-hidden', 'true');

    var typeAndCarrier = document.createElement('span');
    typeAndCarrier.className = 'type-carrier';
    if (phoneNumberAdditionalInfo) {
      if (typeof(phoneNumberAdditionalInfo) === 'string') {
        typeAndCarrier.removeAttribute('data-l10n-id');
        typeAndCarrier.textContent = phoneNumberAdditionalInfo;
      } else {
        typeAndCarrier.setAttribute('data-l10n-id',
                                    phoneNumberAdditionalInfo.id);
      }
    }
    addInfo.appendChild(typeAndCarrier);

    var callTime = document.createElement('span');
    callTime.className = 'call-time';
    callTime.textContent = Utils.prettyDate(date) + ' ';
    addInfo.appendChild(callTime);

    main.appendChild(icon);
    main.appendChild(primInfo);
    main.appendChild(addInfo);

    if (phoneNumberTypeL10nId) {
      // Check if this element has a `bdi` child, and remove it if it does.
      var bdiPrim = primInfoMain.querySelector('bdi');
      primInfoMain.removeChild(bdiPrim);

      primInfoMain.setAttribute('data-l10n-id', phoneNumberTypeL10nId);
      var primElem = primInfoMain.parentNode;
      var parent = primElem.parentNode;
      parent.insertBefore(addInfo, primElem.nextElementSibling);
    }

    groupDOM.appendChild(label);
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
    ol.setAttribute('role', 'listbox');
    ol.setAttribute('aria-multiselectable', true);
    ol.id = 'group-container-' + referenceTimestamp;

    groupContainer.appendChild(header);
    groupContainer.appendChild(ol);

    return groupContainer;
  },

  enableEditModeButton: function cl_enableEditModeButton() {
    var icon = CallLog.callLogIconEdit;
    icon.removeAttribute('disabled');
    icon.setAttribute('aria-disabled', false);
  },

  disableEditModeButton: function cl_disableEditModeButton() {
    var icon = CallLog.callLogIconEdit;
    icon.setAttribute('disabled', 'disabled');
    icon.setAttribute('aria-disabled', true);
  },

  showEditModeButton: function cl_showEditModeButton() {
    CallLog.callLogIconEdit.hidden = false;
  },

  hideEditModeButton: function cl_hideEditModeButton() {
    CallLog.callLogIconEdit.hidden = true;
  },

  showEditMode: function cl_showEditMode(event) {
    if (this.callLogIconEdit.hasAttribute('disabled')) {
      // Disabled does not have effect on an anchor.
      event.preventDefault();
      event.stopPropagation();
      return;
    }
    this.headerEditModeText.setAttribute('data-l10n-id', 'edit');
    this.deleteButton.setAttribute('disabled', 'disabled');
    this.selectAllThreads.removeAttribute('disabled');
    this.selectAllThreads.setAttribute('data-l10n-id', 'selectAll');
    this.deselectAllThreads.setAttribute('disabled', 'disabled');
    document.body.classList.add('recents-edit');
  },

  hideEditMode: function cl_hideEditMode() {
    document.body.classList.remove('recents-edit');
    var cont = this.callLogContainer;
    var inputs = cont.querySelectorAll('input[type="checkbox"]');
    var logItems = cont.querySelectorAll('.log-item');
    var i, l;
    for (i = 0, l = inputs.length; i < l; i++) {
      inputs[i].checked = false;
    }
    for (i = 0, l = logItems.length; i < l; i++) {
      logItems[i].setAttribute('aria-selected', false);
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

  // In case we are in edit mode, just update the counter of selected rows.
  handleEvent: function cl_handleEvent(evt) {
    var logItem = evt.target;
    if (document.body.classList.contains('recents-edit')) {
      if (logItem.dataset.phoneNumber) {
        // Landed on the logItem (when using the screen reader).
        var checkbox = logItem.getElementsByTagName('input')[0];
        var toggleChecked = !checkbox.checked;
        checkbox.checked = toggleChecked;
        logItem.setAttribute('aria-selected', toggleChecked);
      }
      this.updateHeaderCount();
      return;
    }
    var dataset = logItem.dataset;
    var phoneNumber = dataset.phoneNumber;
    if (!phoneNumber) {
      return;
    }

    if (evt.type == 'click') {
      if (navigator.mozIccManager &&
          navigator.mozIccManager.iccIds.length > 1) {
        KeypadManager.updatePhoneNumber(phoneNumber);
        window.location.hash = '#keyboard-view';
      } else {
        SimSettingsHelper.getCardIndexFrom('outgoingCall', function(ci) {
          CallHandler.call(phoneNumber, ci);
        });
      }
    } else {
      evt.preventDefault();
      var primaryInfo = logItem.querySelector('.primary-info-main').textContent;

      LazyLoader.load(['/dialer/js/call_group_menu.js'], function() {
        CallGroupMenu.show(
          primaryInfo,
          phoneNumber,
          dataset.timestamp,
          dataset.type,
          dataset.status);
      });
    }
  },

  filter: function cl_filter() {
    this.callLogContainer.classList.add('filter');
    AccessibilityHelper.setAriaSelected(this.missedFilter.firstElementChild, [
      this.allFilter.firstElementChild, this.missedFilter.firstElementChild]);
    this.callLogContainer.setAttribute('aria-labelledby', 'missed-filter-tab');

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
      this.enableEditModeButton();
    }
  },

  unfilter: function cl_unfilter() {
    // If the call log is empty display the appropriate message, otherwise hide
    // the empty call log message and enable edit mode
    if (this._empty) {
      this.renderEmptyCallLog();
    } else {
      var noResultContainer = document.getElementById('no-result-container');
      noResultContainer.hidden = true;
      this.enableEditModeButton();
    }

    this.callLogContainer.classList.remove('filter');
    AccessibilityHelper.setAriaSelected(this.allFilter.firstElementChild, [
      this.allFilter.firstElementChild, this.missedFilter.firstElementChild]);
    this.callLogContainer.setAttribute('aria-labelledby', 'all-filter-tab');

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
      this.headerEditModeText.setAttribute('data-l10n-id', 'edit');
      this.selectAllThreads.removeAttribute('disabled');
      this.selectAllThreads.setAttribute('data-l10n-id', 'selectAll');
      this.deselectAllThreads.setAttribute('disabled', 'disabled');
      this.deleteButton.setAttribute('disabled', 'disabled');
      return;
    }
    navigator.mozL10n.setAttributes(
      this.headerEditModeText,
      'edit-selected',
      {n: selected});

    this.deleteButton.removeAttribute('disabled');
    if (selected === allInputs) {
      this.deselectAllThreads.removeAttribute('disabled');
      this.selectAllThreads.setAttribute('disabled', 'disabled');
    } else {
      this.selectAllThreads.removeAttribute('disabled');
      this.selectAllThreads.setAttribute('data-l10n-id', 'selectAll');
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
    var msg = {'id': 'delete-n-log?', 'args': {n: inputsSelected.length}};
    var yesObject = {
      title: 'delete',
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
      title: 'cancel',
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
  _updateContact: function _updateContact(log, phoneNumber, contactId,
                                          updateDb) {
    var self = this;
    Contacts.findByNumber(phoneNumber,
                          function(contact, matchingTel) {
      if (!contact || !matchingTel) {
        self._removeContact(log, contactId, updateDb);
        return;
      }

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
    });
  },

  _removeContact: function _removeContact(log, contactId, updateDb) {
    // If the cache is valid, we also need to remove the contact from the
    // cache
    if (this._contactCache && updateDb) {
      var self = this;

      CallLogDBManager.removeGroupContactInfo(contactId, null,
                                              function(result) {
        if (typeof result === 'number' && result > 0) {
          self.updateContactInfo(log);
        }
      });
    } else {
      this.updateContactInfo(log);
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
   * param target
   *        DOM element to be updated. We default to the whole log if no
   *        'target' param is provided.
   */
  updateListWithContactInfo: function cl_updateList(reason, contactId, target) {
    var container = target || this.callLogContainer;

    if (!container) {
      return;
    }

    // Get the list of logs to be updated.
    var logs = [];
    switch (reason) {
      case 'remove':
        logs = container.querySelectorAll('li[data-contact-id="' + contactId +
                                          '"]');
        break;
      /*
      case 'create':
      case 'update':
      */
      default:
        logs = container.querySelectorAll('.log-item');
        break;
    }

    for (var i = 0, l = logs.length; i < l; i++) {
      var log = logs[i];
      var logInfo = log.dataset;

      this._updateContact(log, logInfo.phoneNumber, contactId, i === 0);
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
    var primInfoCont = element.querySelector('.primary-info-main');
    var addInfo = element.getElementsByClassName('additional-info')[0];
    var typeAndCarrier = addInfo.querySelector('.type-carrier');

    if (!matchingTel) {
      if (element.dataset.contactId) {
        // Remove contact info.
        primInfoCont.textContent = '';
        var bdi = document.createElement('bdi');
        bdi.textContent = element.dataset.phoneNumber;
        primInfoCont.appendChild(bdi);
        typeAndCarrier.textContent = '';
        typeAndCarrier.setAttribute('data-l10n-id', 'unknown');
        delete element.dataset.contactId;
      }
      return;
    }

    var primaryInfo =
      Utils.getPhoneNumberPrimaryInfo(matchingTel, contact);
    if (primaryInfo) {
      primInfoCont.textContent = '';
      var bdiPrim = document.createElement('bdi');
      bdiPrim.textContent = primaryInfo;
      primInfoCont.appendChild(bdiPrim);
    }

    var phoneNumberAdditionalInfo =
      Utils.getPhoneNumberAdditionalInfo(matchingTel);
    if (phoneNumberAdditionalInfo && phoneNumberAdditionalInfo.length) {
      typeAndCarrier.textContent = phoneNumberAdditionalInfo;
    }

    if (contact) {
      element.dataset.contactId = contact.id;
    }
  },

  cleanNotifications: function cl_cleanNotifcations() {
    /* On startup of call log, we clear all dialer notification except for USSD
     * ones as those are closed only when the user taps them. */
    Notification.get()
      .then(
        function onSuccess(notifications) {
          for (var i = 0; i < notifications.length; i++) {
            if (!notifications[i].tag) {
              notifications[i].close();
            }
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
  var reason = event.reason;
  var options = {
    filterBy: ['id'],
    filterOp: 'equals',
    filterValue: event.contactID
  };

  /* FIXME: We should use the contact information (id, phone number, etc...) to
   * reduce the number of elements we try to update. */

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
       CallLog.updateListWithContactInfo(reason, event.contactID);
       return;
    }

    var fbReq = fb.getData(contact);
    fbReq.onsuccess = function fbContactSuccess() {
      CallLog.updateListWithContactInfo(reason, event.contactID);
    };
    fbReq.onerror = function fbContactError() {
      console.error('Error while querying FB: ', fbReq.error.name);
      CallLog.updateListWithContactInfo(reason, event.contactID);
    };
  };

  request.onerror = function errorHandler(e) {
    console.error('Error retrieving contact by ID ' + event.contactID);
  };
};
