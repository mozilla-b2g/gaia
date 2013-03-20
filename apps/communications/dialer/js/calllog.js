'use strict';
/*
  TODO:
    - UPGRADE SCHEME TO V=3
    - Clean comments
    - Fixed header
    - Check status (connected or not in outgoing calls)
   
*/
var CallLog = {
  _: null,
  initialized: false,
  init: function cl_init() {
    // We check if it was previously initialized
    if (this.initialized) {
      // If it is we have to update the UI
      this.updateHighlight();
      this.updateHeaders();
      return;
    }
    
    // Update the flag properly
    this.initialized = true;
    // Files pending to load
    var lazyFiles = [
      '/dialer/style/fixed_header.css',
      '/shared/style/switches.css',
      '/shared/style_unstable/lists.css',
      '/dialer/js/phone_action_menu.js',
      '/dialer/js/fixed_header.js',
      '/dialer/js/utils.js'
    ];
    var self = this;
    // We load the pending files CSS & JS needed for CallLog
    LazyLoader.load(lazyFiles, function resourcesLoaded() {
      // Once all files are loaded, we retrieve the mainNodes
      // as before
      var mainNodes = ['header-edit-mode-text',
                        'calllog-icon-edit',
                        'calllog-icon-close',
                        'delete-button',
                        'calllog-container',
                        'calllog-view',
                        'calllog-filter',
                        'all-filter',
                        'missed-filter',
                        'deselect-all-threads',
                        'select-all-threads',
                        'calllog-edit-mode'];
      // Loading each node
      mainNodes.forEach(function(id) {
        this[Utils.toCamelCase(id)] = document.getElementById(id);
      }, self);
      // Once I have loaded all resources
      // Im gonna get l10n if it's not loaded
      LazyL10n.get(function localized(_) {
        self._ = _;
        // var headerSelector = '#calllog-container header';
        // FixedHeader.init('#calllog-container',
        //                  '#fixed-container', headerSelector);
        // Render the list of logs
        self.render();
        // Adding Listeners 
        self.calllogIconEdit.addEventListener('click', self.showEditMode.bind(self));
        self.calllogIconClose.addEventListener('click', self.hideEditMode.bind(self));
        self.missedFilter.addEventListener('click', self.filter.bind(self));
        self.allFilter.addEventListener('click', self.unfilter.bind(self));
        self.calllogContainer.addEventListener('click', self);
        self.selectAllThreads.addEventListener('click', self.selectAll.bind(self));
        self.deselectAllThreads.addEventListener('click', self.deselectAll.bind(self));
        self.deleteButton.addEventListener('click', self.deleteLogGroups.bind(self));
        document.addEventListener('mozvisibilitychange', function() {
          if (!document.hidden) {
            self.updateHeaders();
            self.updateHighlight();
          }
        });
      });
    });
    
  },
  // Method for highlight call events since last visit to calllog
  updateHighlight: function cl_updateHighlight() {
    var self = this;
    window.asyncStorage.getItem('latestCallLogVisit', function getItem(referenceTimestamp) {
      if (referenceTimestamp) {
        var logs = self.calllogContainer.getElementsByTagName('li');
        for (var i = 0; i < logs.length; i++) {
          if(logs[i].dataset.timestamp > referenceTimestamp) {
            logs[i].classList.add('highlighted');
          } else {
            logs[i].classList.remove('highlighted');
          }
        }
      }
      window.asyncStorage.setItem('latestCallLogVisit', Date.now());
    });
  },
  // Method for updating the time in headers based on device time
  updateHeaders: function cl_updateHeaders() {
    var headers = this.calllogContainer.getElementsByTagName('header');
    for (var i = 0; i < headers.length; i++) {
      var parsedInfo = Utils.headerDate(parseInt(headers[i].dataset.timestamp));
      if(parsedInfo !== headers[i].textContent) {
        headers[i].textContent = parsedInfo;
      }
    }
  },
  // Method for updating headers automatically
  updateHeadersContinuosly: function cl_updateHeaders() {
    // Update each minute
    setInterval(this.updateHeaders.bind(this),60000);
  },
  // Method for rendering adapted to cursor pattern
  render: function cl_render() {
    // This method should be called once
    // It's in charge of rendering the whole list of logs
    var self = this;
    var phoneNumbers = [];
    CallLogDBManager.getGroupList(function logGroupsRetrieved(cursor) {
      if (!cursor.value) {
        if (phoneNumbers.length === 0) {
          self.renderEmptyCallLog();
        } else {
          // FixedHeader.refresh();
          self.updateHeadersContinuosly();
          self.updateListWithContactInfo(phoneNumbers);
        }
        return;
      }
      self.enableEditMode();
      self.appendLogGroup(cursor.value);
      phoneNumbers.push(cursor.value.number);
      cursor.continue();
    }, 'date', true, true);
  },
  // Rendering empty screen
  renderEmptyCallLog: function cl_renderEmptyCallLog() {
    this.disableEditMode();
    this.calllogContainer.innerHTML =
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
  // Method for appending a new group in the list
  appendLogGroup: function cl_appendLogGroup(logGroup, enableEditMode, updateWithContact) {
    // If it's not initialized there is nothing to append, only store.
    if (!this.initialized)  {
      return;
    }
    // If needed, we are going to show 'edit' button
    if (enableEditMode) {
      this.enableEditMode();
    }
    // Retrieving the phone number and give the functionality for updating
    // the log with the contact info
    var phoneNumber = logGroup.number;
    function updateWithContact() {
      if (updateWithContact) {
        CallLog.updateListWithContactInfo([phoneNumber]);
      }
    }
    // Create element of logGroup
    var logGroupDOM = this.createLogGroup(logGroup);
    var dayIndex = Utils.getDayDate(logGroup.date);
    // Is there any previous element with the same characteristics?
    var previousLogGroup = document.getElementById(logGroup.id);
    // If there is any element we are going to remove the not-up-to-date one.
    if (previousLogGroup) {
      // Remove previous element
      var previousLogGroupContainer = previousLogGroup.parentNode;
      previousLogGroupContainer.removeChild(previousLogGroup);
      if (document.body.classList.contains('recents-edit')) {
        this.updateHeaderCount();
      }
      
      // If needed we should remove the whole container
      if (previousLogGroupContainer.children.length === 0) {
        var previousSection = previousLogGroupContainer.parentNode;
        this.calllogContainer.removeChild(previousSection);
      }
    }
    // We are going to append the element in the right position
    var calllogSection, logGroupContainer;
    var previousSections = this.calllogContainer.getElementsByTagName('section');
    var previousSectionsLength = previousSections.length;
    var self = this;
    function createCommonStructure() {
      // Create the section with header/ol
      calllogSection = self.createLogGroupsContainer(logGroup);
      // Retrieve the ol container
      logGroupContainer = calllogSection.getElementsByTagName('ol')[0];
      // Append the logGroup
      logGroupContainer.appendChild(logGroupDOM);
    };
    // If there is no section we append diretly the new section
    if (previousSectionsLength === 0) {
      // Clean the main container
      this.calllogContainer.innerHTML = '';
      // Create common structure
      createCommonStructure();
      // Append to the main container
      this.calllogContainer.appendChild(calllogSection);
      // We update with contact
      updateWithContact.bind(this);
      // Refresh fixed header
      // FixedHeader.refresh();
      return;
    }
    // If there are previous sections, which is the right one?
    var referenceSection;
    for (var i = 0; i < previousSectionsLength; i++) {
      if(dayIndex == previousSections[i].dataset.timestamp) {
        // I found the right container
        calllogSection = previousSections[i];
        logGroupContainer = calllogSection.getElementsByTagName('ol')[0];
        break;
      } else if (dayIndex > previousSections[i].dataset.timestamp) {
        // There is no container yet, but will be before the
        // the reference one
        referenceSection = previousSections[i];
        break;
      }
    }

    if (referenceSection) {
      // If there is reference, we should create and append before
      // Create common structure
      createCommonStructure();
      // Insert taking into account the reference
      this.calllogContainer.insertBefore(calllogSection, referenceSection);
      // We update with contact
      updateWithContact.bind(this);
      // Refresh fixed header
      // FixedHeader.refresh();
      return;
    } else if (!referenceSection && !calllogSection) {
      // We have to append at the end
      // Create common structure
      createCommonStructure();
      // Append at the end of the main container
      this.calllogContainer.appendChild(calllogSection);
      // We update with contact
      updateWithContact.bind(this);
      // Refresh fixed header
      // FixedHeader.refresh();
      return;
    }
    
    // If there is a previous section, we are going to place inside
    // in the right position
    var logGroupPlaced = false;
    logGroupContainer = calllogSection.getElementsByTagName('ol')[0];
    var logGroups = logGroupContainer.getElementsByTagName('li');
    var logGroupsLength = logGroups.length;
    for (var i = 0; i < logGroupsLength; i++) {
      if (logGroup.date > parseInt(logGroups[i].dataset.timestamp)) {
        logGroupContainer.insertBefore(logGroupDOM, logGroups[i]);
        // We update with contact
        updateWithContact();
      
        logGroupPlaced = true;
        break;
      }
    }

    if (!logGroupPlaced) {
      logGroupContainer.appendChild(logGroupDOM);
      // We update with contact
      updateWithContact.bind(this);
      
    }
  },
  // Method which create the DOM structure for call-log
  createLogGroup: function cl_createLogGroup(logGroup) {
    // We create the structure
    var logGroupDOM = document.createElement('li');
    // Add class
    logGroupDOM.classList.add('log-item');
    // Add dataset info needed
    logGroupDOM.dataset.timestamp = logGroup.date;
    logGroupDOM.dataset.phoneNumber = logGroup.number;
    // Add ID
    logGroupDOM.id = logGroup.id;
    // Add classes for the icon based on the type of the call
    var iconStyle = 'icon ';
    console.log(logGroup.type +' '+logGroup.status);
    switch(logGroup.type) {
      case 'dialing':
        iconStyle += 'icon-outgoing';
        break;
      case 'incoming':
        if (logGroup.status === 'connected') {
          iconStyle += 'icon-incoming';
        } else {
          iconStyle += 'icon-missed';
          logGroupDOM.classList.add('missed-call');
        }

    }
    // Add HTML content
    logGroupDOM.innerHTML = 
        '  <label class="call-log-selection danger">' +
        '    <input type="checkbox" value="' + logGroup.id + '"/>' + // TODO Añadir ID
        '    <span></span>' +
        '  </label>' +
        '  <aside class="pack-end">' +
        '    <img class="call-log-contact-photo" src="myimage.jpg">' +
        '  </aside>' +
        '  <a href="#">' +
        '    <aside class="icon call-type-icon ' + iconStyle + '"></aside>' +
        '    <p class="primary-info">' +
        '      <span class="primary-info-main">' +
                 (logGroup.number || this._('unknown')) +
        '      </span>' + '<span class="many-contacts">' +
        '      </span>' + '<span class="entry-count">' +
        '&#160;(' + logGroup.retryCount + ')' +
        '      </span>' +
        '    </p>' +
        '    <p class="secondary-info">' +
        '      <span class="call-time">' +
                 Utils.prettyDate(logGroup.date) +
        '      </span>' +
        '      <span class="call-additional-info">' +
        '      </span>' +
        '    </p>' +
        '  </a>';
    return logGroupDOM;
  },
  // Create container for logs
  createLogGroupsContainer: function cl_createLogGroupsContainer(logGroup) {
    // We retrieve the params needed
    var referenceTimestamp = Utils.getDayDate(logGroup.date);
    // Create the section
    var groupContainer = document.createElement('section');
    groupContainer.dataset.timestamp = referenceTimestamp;
    // Create the header
    var header = document.createElement('header');
    header.textContent = Utils.headerDate(referenceTimestamp);
    header.dataset.timestamp = referenceTimestamp;
    header.dataset.update = true;
    // Create the OL where all logs will be into
    var ol = document.createElement('ol');
    ol.classList.add('log-group');
    ol.id = 'group-container-' + referenceTimestamp;
    
    groupContainer.appendChild(header);
    groupContainer.appendChild(ol);
  
    return groupContainer;
  },
  // Methods for updating with contact info given a list of numbers
  updateListWithContactInfo: function cl_updateListWithContactInfo(phoneNumbers) {
    var phoneNumber = phoneNumbers.pop();
    var self = this;
    Contacts.findByNumber(phoneNumber, function (contact, matchingTel, contactsWithSameNumber, contactIDs) {
      var logsToUpdate = CallLog.calllogContainer.querySelectorAll('[data-phone-number="' + phoneNumber + '"]');
      for (var j = 0, l = logsToUpdate.length; j < l; j++) {
        if (contact && contact !== null) {
          var infoToUpdate = {
            element: logsToUpdate[j],
            contact: contact,
            matchingTel: matchingTel,
            contactsWithSameNumber: contactsWithSameNumber,
            contactIDs: contactIDs
          };
        } else {
          var infoToUpdate = {
            element: logsToUpdate[j]
          };
        }
        
        CallLog.updateContactInfo(infoToUpdate);
      }
      if (phoneNumbers.length > 0) {
        self.updateListWithContactInfo(phoneNumbers);
      }
    });
  },
  // Update an element with contact info.
  updateContactInfo: function cl_updateContactInfo(params) {
    // We update the DOM with params related to Contacts
    var el = params.element;
    var contact = params.contact;
    if (!params.matchingTel && !el.dataset.contactId) {
      return;
    }
    // We retrieve most important elements
    var primaryInfoContainer = el.getElementsByClassName('primary-info-main')[0];
    var numContactsContainer = el.getElementsByClassName('many-contacts')[0];
    var contactPhoto = el.querySelector('.call-log-contact-photo');
    var additionalInfoContainer = el.getElementsByClassName('call-additional-info')[0];

    if (!params.matchingTel && el.dataset.contactId) {
        primaryInfoContainer.textContent = el.dataset.phoneNumber;
        numContactsContainer.textContent = '';
        additionalInfoContainer.textContent = '';
        contactPhoto.src = '';
        this.fitPrimaryInfoToSpace(el);
        delete el.dataset.contactId;
        return;
    }
    // Update NAME as primary info
    var primaryInfo =
      Utils.getPhoneNumberPrimaryInfo(params.matchingTel, params.contact);
    if (primaryInfo) {
      primaryInfoContainer.textContent = primaryInfo;
    } else {
      LazyL10n.get(function gotL10n(_) {
        primaryInfoContainer.textContent = _('unknown');
      });
    }
    // Update number of contacts with the same phone number
    if (params.contactsWithSameNumber) {
      numContactsContainer.innerHTML =
        '&#160;' + this._('contactNameWithOthersSuffix',
          {n: params.contactsWithSameNumber});
    } else {
      numContactsContainer.textContent = '';
    }
    // Update photo if needed
    if (params.contact.photo && params.contact.photo[0]) {
      var photoURL = URL.createObjectURL(params.contact.photo[0]);
      contactPhoto.src = photoURL;
      el.classList.add('hasPhoto');
    } else {
      contactPhoto.src = '';
    }

    var phoneNumberAdditionalInfo =
      Utils.getPhoneNumberAdditionalInfo(params.matchingTel, params.contact);
    
    additionalInfoContainer.textContent = phoneNumberAdditionalInfo;
    el.dataset.contactId = params.contactIDs;

    this.fitPrimaryInfoToSpace(el);
  },
  // Remove contact info from logs.
  removeContactInfo: function cl_removeContactInfo(contactID) {
    var logs = CallLog.calllogContainer.getElementsByTagName('li');
    var phoneNumber = [];
    for (var k = 0; k < logs.length; k++) {
      console.log(logs[k].dataset.contactId);
      if (logs[k].dataset.contactId && logs[k].dataset.contactId.indexOf(contactID) !== -1) {
        phoneNumber.push(logs[k].dataset.phoneNumber);
        break;
      }
    }
    if (phoneNumber.length > 0) {
      CallLog.updateListWithContactInfo(phoneNumber);
    }
  },

  enableEditMode: function cl_enableEditMode() {
    CallLog.calllogIconEdit.classList.remove('disabled');
  },

  disableEditMode: function cl_enableEditMode() {
    CallLog.calllogIconEdit.classList.add('disabled');
  },

  showEditMode: function cl_showEditMode() {
    this.headerEditModeText.textContent = this._('edit');
    document.body.classList.add('recents-edit');
  },

  hideEditMode: function cl_hideEditMode() {
    document.body.classList.remove('recents-edit');
    var inputs = this.calllogContainer.querySelectorAll('input[type="checkbox"]');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = false;
    };
  },

  handleEvent: function cl_handleEvent(evt) {
    // Handle action
    if (document.body.classList.contains('recents-edit')) {
      this.updateHeaderCount();
      return;
    }
    var phoneNumber = evt.target.dataset.phoneNumber;
    if (phoneNumber) {
      var contactIds = (evt.target.dataset.contactId) ? evt.target.dataset.contactId : null;
      var contactId = null;
      if (contactIds !== null) {
        contactId = contactIds.split(',')[0];
      }
      PhoneNumberActionMenu.show(contactId, phoneNumber);
    }
  },

  filter: function cl_filter() {
    if (document.body.classList.contains('recents-edit')){
      return;
    }
    this.calllogContainer.classList.add('filter');
    this.allFilter.classList.remove('selected');
    this.missedFilter.classList.add('selected');
    
    // Check if I have to hide any day group
    var containers = this.calllogContainer.getElementsByTagName('ol');
    for (var i = 0, l = containers.length; i < l; i++) {

      var noMissedCalls = containers[i].getElementsByClassName('missed-call').length;
      console.log(noMissedCalls);
      if (noMissedCalls === 0) {
        containers[i].parentNode.classList.add('groupFiltered');
      }

    };
  },

  unfilter: function cl_unfilter() {
    if (document.body.classList.contains('recents-edit')){
      return;
    }
    this.calllogContainer.classList.remove('filter');
    this.missedFilter.classList.remove('selected');
    this.allFilter.classList.add('selected');
    

    var hiddenContainers = document.getElementsByClassName('groupFiltered');
    for (var i = 0; i < hiddenContainers.length; i++) {
      hiddenContainers[i].classList.remove('groupFiltered');
    }
  },

  updateHeaderCount: function cl_updateHeaderCount() {
    var selected = this.calllogContainer.querySelectorAll('input[type="checkbox"]:checked').length;
    var allInputs = this.calllogContainer.querySelectorAll('input[type="checkbox"]').length;
    console.log(selected+'/'+allInputs);

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
    if(selected === allInputs) {
      
      this.deselectAllThreads.removeAttribute('disabled');
      this.selectAllThreads.setAttribute('disabled', 'disabled');
      
    } else {
      this.selectAllThreads.removeAttribute('disabled');
      this.deselectAllThreads.removeAttribute('disabled');
    }
  },

  selectAll: function cl_selectAll() {
    var inputs =
            this.calllogContainer.querySelectorAll('input[type="checkbox"]:not(:checked)');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = true;
    }
    this.updateHeaderCount();
  },

  deselectAll: function cl_selectAll() {
    var inputs =
            this.calllogContainer.querySelectorAll('input[type="checkbox"]:checked');
    for (var i = 0; i < inputs.length; i++) {
      inputs[i].checked = false;
    }
    this.updateHeaderCount();
  },

  deleteLogGroups: function cl_deleteLogGroups() {

    console.log('Eliminar');
    var inputsSelected =
            this.calllogContainer.querySelectorAll('input[type="checkbox"]:checked');
    var logGroupsToDelete = [];
    for (var i = 0; i < inputsSelected.length; i++) {
      var logGroup = inputsSelected[i].parentNode.parentNode;
      var olContainer = logGroup.parentNode;
      // Remove element from DOM
      olContainer.removeChild(logGroup);
      // Is the last child?
      if (olContainer.children.length === 0) {
        // Remove the element
        var section = olContainer.parentNode;
        this.calllogContainer.removeChild(section);
      }
      logGroupsToDelete.push(inputsSelected[i].value);
    }
    // Call to DB
    console.log(logGroupsToDelete);
    var self = this;
    CallLogDBManager.deleteGroupList(logGroupsToDelete, function() {
      var currentContainers = self.calllogContainer.getElementsByTagName('li');
      if (currentContainers.length === 0) {

        self.renderEmptyCallLog();
      }


      document.body.classList.remove('recents-edit');
    });
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


// Keep the call history up to date
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
        var contact = e.target.result[0];
        if (contact && contact !== null) {
          var phoneNumber = [contact.tel[0].value];
          CallLog.updateListWithContactInfo(phoneNumber);
        }
      };

      request.onerror = function errorHandler(e) {
        console.log('Error retrieving contact by ID '+event.contactID);
      };
      break;

    case 'remove':
      // Avoiding refresh the whole list. We just remove
      // contact info from entries with data-contact-id = id
      CallLog.removeContactInfo(event.contactID);
      break;
  }
};
