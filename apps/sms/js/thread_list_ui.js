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
      var nameContainer = thread.getElementsByClassName('name')[0];
      var photo = thread.getElementsByTagName('img')[0];
      // !contacts matches null results from errors
      // !contacts.length matches empty arrays from unmatches filters
      if (!contacts || !contacts.length) {
        // if no contacts, we show the number
        nameContainer.textContent = number;
        photo.src = '';
        return;
      }
      // If there is contact with the phone number requested, we
      // update the info in the thread
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
      this.checkAllButton.disabled = true;
    } else {
      this.checkAllButton.disabled = false;
    }
    if (selected) {
      this.uncheckAllButton.disabled = false;
      this.deleteButton.disabled = false;
      this.editMode.innerHTML = _('selected', {n: selected});
    } else {
      this.uncheckAllButton.disabled = true;
      this.deleteButton.disabled = true;
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

  threadHashes: {},
  renderThreads: function thlui_renderThreads(threads, renderCallback) {
    var getThreadHash = function(t) {
      return t.participants[0] + '|' +
        (0+t.timestamp) +
        '|' + t.body + '|'
        + t.unreadCount;
    };

    ThreadListUI.count = threads.length;

    if (threads.length === 0) {
      ThreadListUI.noMessages.classList.remove('hide');
      ThreadListUI.container.classList.add('hide');
      ThreadListUI.editIcon.classList.add('disabled');

      renderCallback && renderCallback();
      return;
    }
    else {
      ThreadListUI.noMessages.classList.add('hide');
      ThreadListUI.container.classList.remove('hide');
      ThreadListUI.editIcon.classList.remove('disabled');

      FixedHeader.init('#threads-container',
                       '#threads-header-container',
                       'header');
    }

    threads = threads.sort(function(a, b) {
      return b.timestamp - a.timestamp;
    });

    // Two scenario's:
    //  1. Empty thread list, initial drawing
    if (ThreadListUI.container.querySelectorAll('li').length === 0) {
      var lastHeader;
      var fragments = [];
      // we're already in the right order so we can go go go!
      threads.forEach(function(t) {
        var dayDate = Utils.getDayDate(t.timestamp);
        if (dayDate !== lastHeader) {
          lastHeader = dayDate;

          // and add the thread container
          fragments.push(ThreadListUI.createThreadContainer(dayDate));
        }

        // create thread element
        var threadFragment = ThreadListUI.createThread(t);

        // Update info given a number
        var num = t.participants[0];
        ThreadListUI.updateThreadWithContact(num, threadFragment);
        // And append...
        var ul = fragments[fragments.length - 1].childNodes[1];
        ul.appendChild(threadFragment);

        ThreadListUI.threadHashes[t.id] = getThreadHash(t);
      });

      // and voila!
      fragments.forEach(function(f) {
        ThreadListUI.container.appendChild(f);
      });

      renderCallback && renderCallback();
    }
    // Redraw!
    else {

      var redrawList = threads.filter(function(t) {
        return !ThreadListUI.threadHashes[t.id] ||
          getThreadHash(t) !== ThreadListUI.threadHashes[t.id];
      });

      var tids = threads.map(function(t) {
        return t.id + '';
      });
      var deleteList = Object.keys(ThreadListUI.threadHashes).filter(function(id) {
        return tids.indexOf('' + id) === -1;
      });

      deleteList.forEach(function(tid) {
        ThreadListUI.deleteThreadFromUi(tid);
        delete ThreadListUI.threadHashes[tid];
      });

      // redrawlist is in order, so we can just do iterate over
      // until we found one that is older than us
      redrawList.forEach(function(thread) {
        var li = document.getElementById('thread_' + thread.id);
        if (!li) {
          // create thread element
          li = ThreadListUI.createThread(thread);

          // Update info given a number
          ThreadListUI.updateThreadWithContact(thread.participants[0], li);

          ThreadListUI.insertThreadInUi(li, thread, threads, tids);
        }
        else {
          // update thread
          var allPs = li.querySelectorAll('p');
          allPs[allPs.length - 1].childNodes[1].textContent = thread.body;

          if (thread.unreadCount > 0)
            li.querySelector('a').classList.add('unread');
          else
            li.querySelector('a').classList.remove('unread');

          li.querySelector('time').textContent = Utils.getFormattedHour(thread.timestamp);

          var oldParent = li.parentNode;

          ThreadListUI.insertThreadInUi(li, thread, threads, tids);

          // if the old container is now empty...
          if (oldParent.childNodes.length === 0) {
            // delete header and ul elements
            oldParent.parentNode.removeChild(oldParent.previousSibling);
            oldParent.parentNode.removeChild(oldParent);
          }
        }
      });

      renderCallback && renderCallback();
    }
  },

  insertThreadInUi: function(li, thread, allThreads, tids) {
    // Get the container
    // threadsContainer_
    var dayDate = Utils.getDayDate(thread.timestamp);
    var container = document.getElementById(
      'threadsContainer_' + dayDate);
    if (!container) {
      container = ThreadListUI.createThreadContainer(dayDate);
      container.childNodes[1].appendChild(li);

      // find previous node and then add it
      var daydate = Utils.getDayDate((allThreads[tids.indexOf('' + thread.id) - 1] || {}).timestamp);
      var previousNode = document.getElementById('threadsContainer_' + daydate);

      if (previousNode) {
        previousNode.parentNode.insertBefore(container, previousNode.nextSibling);
      }
      else {
        ThreadListUI.container.insertBefore(container, ThreadListUI.container.querySelectorAll('header')[0]);
      }
    }
    else {
      // find previous node and then add it
      var previousNode = document.getElementById(
          'thread_' + (allThreads[tids.indexOf('' + thread.id) - 1] || {}).id
        );

      if (previousNode && previousNode.parentNode === container)
        previousNode.parentNode.insertBefore(li, previousNode.nextSibling);
      else
        container.insertBefore(li, container.querySelectorAll('li')[0]);
    }
  },

  deleteThreadFromUi: function(tid) {
    var li = document.getElementById('thread_' + tid);
    // remove this node
    var parent = li.parentNode;
    parent.removeChild(li);
    if (parent.childNodes.length === 0) {
      // no more children? remove ul and header
      var header = parent.previousSibling;
      parent.parentNode.removeChild(header);
      parent.parentNode.removeChild(parent);
    }
  },

  createThread: function thlui_createThread(thread) {
    // Create DOM element
    var num = thread.participants[0];
    var timestamp = thread.timestamp.getTime();
    var threadDOM = document.createElement('li');
    threadDOM.id = 'thread_' + thread.id;
    threadDOM.dataset.time = timestamp;
    threadDOM.dataset.phoneNumber = num;

    // Retrieving params from thread
    var bodyText = (thread.body || '').split('\n')[0];
    var bodyHTML = Utils.Message.format(bodyText);
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
      var num = thread.dataset.phoneNumber;
      // Update info of the contact given a number
      ThreadListUI.updateThreadWithContact(num, thread);
    }
  }
};
