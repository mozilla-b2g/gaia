/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ThreadListUI = {
  // Used to track the current number of rendered
  // threads. Updated in ThreadListUI.renderThreads
  count: 0,

  init: function thlui_init() {
    var _ = navigator.mozL10n.get;

    // TODO: https://bugzilla.mozilla.org/show_bug.cgi?id=854413
    [
      'container', 'no-messages',
      'check-all-button', 'uncheck-all-button',
      'delete-button', 'cancel-button',
      'edit-icon', 'edit-mode', 'edit-form'
    ].forEach(function(id) {
      this[Utils.camelCase(id)] = document.getElementById('threads-' + id);
    }, this);

    this.delNumList = [];
    this.selectedInputs = [];
    this.fullHeight = this.container.offsetHeight;

    this.checkAllButton.addEventListener(
      'click', this.toggleCheckedAll.bind(this, true)
    );

    this.uncheckAllButton.addEventListener(
      'click', this.toggleCheckedAll.bind(this, false)
    );

    this.deleteButton.addEventListener(
      'click', this.delete.bind(this)
    );

    this.cancelButton.addEventListener(
      'click', this.cancelEditMode.bind(this)
    );

    this.container.addEventListener(
      'click', this
    );

    this.editForm.addEventListener(
      'submit', this
    );
  },

  updateThreadWithContact:
    function thlui_updateThreadWithContact(number, thread) {

    Contacts.findByString(number, function gotContact(contacts) {
      // !contacts matches null results from errors
      // !contacts.length matches empty arrays from unmatches filters
      if (!contacts || !contacts.length) {
        return;
      }
      // If there is contact with the phone number requested, we
      // update the info in the thread
      var nameContainer = thread.getElementsByClassName('name')[0];
      var contact = contacts[0];

      // Update contact phone number
      var contactName = contact.name[0];
      if (contacts.length > 1) {
        // If there are more than one contact with same phone number
        var others = contacts.length - 1;
        nameContainer.textContent = navigator.mozL10n.get('others', {
          name: contactName,
          n: others
        });
      }else {
        nameContainer.textContent = contactName;
      }
      // Do we have to update photo?
      if (contact.photo && contact.photo[0]) {
        var photo = thread.getElementsByTagName('img')[0];
        var photoURL = URL.createObjectURL(contact.photo[0]);
        photo.src = photoURL;
      }
    });
  },

  handleEvent: function thlui_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        // Duck type determination; if the click event occurred on
        // a target with a |type| property, then assume it could've
        // been a checkbox and proceed w/ validation condition
        if (evt.target.type && evt.target.type === 'checkbox') {
          ThreadListUI.clickInput(evt.target);
          ThreadListUI.checkInputs();
        }
        break;
      case 'submit':
        evt.preventDefault();
        break;
    }
  },

  clickInput: function thlui_clickInput(target) {
    if (target.checked) {
      ThreadListUI.selectedInputs.push(target);
    } else {
      ThreadListUI.selectedInputs.splice(
        ThreadListUI.selectedInputs.indexOf(target), 1);
    }
  },

  checkInputs: function thlui_checkInputs() {
    var _ = navigator.mozL10n.get;
    var selected = ThreadListUI.selectedInputs.length;

    if (selected === ThreadListUI.count) {
      this.checkAllButton.classList.add('disabled');
    } else {
      this.checkAllButton.classList.remove('disabled');
    }
    if (selected) {
      this.uncheckAllButton.classList.remove('disabled');
      this.deleteButton.classList.remove('disabled');
      this.editMode.innerHTML = _('selected', {n: selected});
    } else {
      this.uncheckAllButton.classList.add('disabled');
      this.deleteButton.classList.add('disabled');
      this.editMode.innerHTML = _('editMode');
    }
  },

  cleanForm: function thlui_cleanForm() {
    var inputs = this.container.querySelectorAll(
      'input[type="checkbox"]'
    );
    var length = inputs.length;
    for (var i = 0; i < length; i++) {
      inputs[i].checked = false;
      inputs[i].parentNode.parentNode.classList.remove('undo-candidate');
    }
    this.delNumList = [];
    this.selectedInputs = [];
    this.editMode.textContent = navigator.mozL10n.get('editMode');
    this.checkInputs();
  },

  toggleCheckedAll: function thlui_select(value) {
    var inputs = this.container.querySelectorAll(
      'input[type="checkbox"]' +
      // value ?
      //   true : query for currently unselected threads
      //   false: query for currently selected threads
      (value ? ':not(:checked)' : ':checked')
    );
    var length = inputs.length;
    for (var i = 0; i < length; i++) {
      inputs[i].checked = value;
      this.clickInput(inputs[i]);
    }
    this.checkInputs();
  },

  delete: function thlui_delete() {
    var question = navigator.mozL10n.get('deleteThreads-confirmation2');
    if (confirm(question)) {
      WaitingScreen.show();
      var inputs = this.selectedInputs;
      var nums = inputs.map(function(input) {
        return input.value;
      });

      var filter = new MozSmsFilter();
      filter.numbers = nums;
      var messagesToDeleteIDs = [];
      var options = {
        stepCB: function getMessageToDelete(message) {
          messagesToDeleteIDs.push(message.id);
        },
        filter: filter,
        invert: true,
        endCB: function deleteMessages() {
          MessageManager.deleteMessages(messagesToDeleteIDs,
            function smsDeleted() {
            MessageManager.getThreads(function recoverThreads(threads) {
              ThreadListUI.editDone = true;
              window.location.hash = '#thread-list';
            });
          });
        }
      };
      MessageManager.getMessages(options);
    }
  },

  cancelEditMode: function thlui_cancelEditMode() {
    window.location.hash = '#thread-list';
  },

  renderThreads: function thlui_renderThreads(threads, renderCallback) {
    // TODO: https://bugzilla.mozilla.org/show_bug.cgi?id=854417
    // Refactor the rendering method: do not empty the entire
    // list on every render.
    ThreadListUI.container.innerHTML = '';
    ThreadListUI.count = threads.length;

    if (threads.length) {
      // There are messages to display.
      //  1. Add the "hide" class to the threads-no-messages display
      //  2. Remove the "hide" class from the view
      //
      ThreadListUI.noMessages.classList.add('hide');
      ThreadListUI.container.classList.remove('hide');
      ThreadListUI.editIcon.classList.remove('disabled');

      FixedHeader.init('#threads-container',
                       '#threads-header-container',
                       'header');
      // Edit mode available

      var appendThreads = function(threads, callback) {
        if (!threads.length) {
          // Refresh fixed header logic
          FixedHeader.refresh();

          if (callback) {
            callback();
          }
          return;
        }
        var thread = threads.pop();
        setTimeout(function() {
          ThreadListUI.appendThread(thread);
          appendThreads(threads, callback);
        });
      };

      appendThreads(threads, function at_callback() {
        // Boot update of headers
        Utils.updateTimeHeaders();
        // Once the rendering it's done, callback if needed
        if (renderCallback) {
          renderCallback();
        }
      });
    } else {
      // There are no messages to display.
      //  1. Remove the "hide" class from threads-no-messages display
      //  2. Add the "hide" class to the view
      //
      ThreadListUI.noMessages.classList.remove('hide');
      ThreadListUI.container.classList.add('hide');
      ThreadListUI.editIcon.classList.add('disabled');

      // Callback if exist
      if (renderCallback) {
        setTimeout(function executeCB() {
          renderCallback();
        });
      }
    }
  },

  createThread: function thlui_createThread(thread) {
    // Create DOM element
    var num = thread.senderOrReceiver;
    var timestamp = thread.timestamp.getTime();
    var threadDOM = document.createElement('li');
    threadDOM.id = 'thread_' + num;
    threadDOM.dataset.time = timestamp;

    // Retrieving params from thread
    var bodyText = (thread.body || '').split('\n')[0];
    var bodyHTML = Utils.escapeHTML(bodyText);
    var formattedDate = Utils.getFormattedHour(timestamp);
    // Create HTML Structure
    var structureHTML = '<label class="danger">' +
                          '<input type="checkbox" value="' + num + '">' +
                          '<span></span>' +
                        '</label>' +
                        '<a href="#num=' + num +
                          '" class="' +
                          (thread.unreadCount > 0 ? 'unread' : '') + '">' +
                          '<aside class="icon icon-unread">unread</aside>' +
                          '<aside class="pack-end">' +
                            '<img src="">' +
                          '</aside>' +
                          '<p class="name">' + num + '</p>' +
                          '<p><time>' + formattedDate +
                          '</time>' + bodyHTML + '</p>' +
                        '</a>';

    // Update HTML
    threadDOM.innerHTML = structureHTML;

    return threadDOM;
  },
  insertThreadContainer:
    function thlui_insertThreadContainer(fragment, timestamp) {
    // We look for placing the group in the right place.
    var headers = ThreadListUI.container.getElementsByTagName('header');
    var groupFound = false;
    for (var i = 0; i < headers.length; i++) {
      if (timestamp >= headers[i].dataset.time) {
        groupFound = true;
        ThreadListUI.container.insertBefore(fragment, headers[i]);
        break;
      }
    }
    if (!groupFound) {
      ThreadListUI.container.appendChild(fragment);
    }
  },
  appendThread: function thlui_appendThread(thread) {
    var num = thread.senderOrReceiver;
    var timestamp = thread.timestamp.getTime();
    // We create the DOM element of the thread
    var threadDOM = this.createThread(thread);
    // Update info given a number
    ThreadListUI.updateThreadWithContact(num, threadDOM);

    // Is there any container already?
    var threadsContainerID = 'threadsContainer_' +
                              Utils.getDayDate(thread.timestamp);
    var threadsContainer = document.getElementById(threadsContainerID);
    // If there is no container we create & insert it to the DOM
    if (!threadsContainer) {
      // We create the fragment with groul 'header' & 'ul'
      var threadsContainerFragment =
        ThreadListUI.createThreadContainer(timestamp);
      // Update threadsContainer with the new value
      threadsContainer = threadsContainerFragment.childNodes[1];
      // Place our new fragment in the DOM
      ThreadListUI.insertThreadContainer(threadsContainerFragment, timestamp);
    }

    // Where have I to place the new thread?
    var threads = threadsContainer.getElementsByTagName('li');
    var threadFound = false;
    for (var i = 0, l = threads.length; i < l; i++) {
      if (timestamp > threads[i].dataset.time) {
        threadFound = true;
        threadsContainer.insertBefore(threadDOM, threads[i]);
        break;
      }
    }
    if (!threadFound) {
      threadsContainer.appendChild(threadDOM);
    }
  },
  // Adds a new grouping header if necessary (today, tomorrow, ...)
  createThreadContainer: function thlui_createThreadContainer(timestamp) {
    var threadContainer = document.createDocumentFragment();
    // Create Header DOM Element
    var headerDOM = document.createElement('header');
    // Append 'time-update' state
    headerDOM.dataset.timeUpdate = true;
    headerDOM.dataset.time = timestamp;
    headerDOM.dataset.isThread = true;

    // Create UL DOM Element
    var threadsContainerDOM = document.createElement('ul');
    threadsContainerDOM.id = 'threadsContainer_' +
                              Utils.getDayDate(timestamp);
    // Add text
    headerDOM.innerHTML = Utils.getHeaderDate(timestamp);

    // Add to DOM all elements
    threadContainer.appendChild(headerDOM);
    threadContainer.appendChild(threadsContainerDOM);
    return threadContainer;
  },
  // Method for updating all contact info after creating a contact
  updateContactsInfo: function mm_updateContactsInfo() {
    // Retrieve all 'li' elements and getting the phone numbers
    var threads = ThreadListUI.container.getElementsByTagName('li');
    for (var i = 0; i < threads.length; i++) {
      var thread = threads[i];
      var num = thread.id.replace('thread_', '');
      // Update info of the contact given a number
      ThreadListUI.updateThreadWithContact(num, thread);
    }
  }
};
