/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

'use strict';

var ThreadListUI = {
  // Used to track the current number of rendered
  // threads. Updated in ThreadListUI.renderThreads
  count: 0,

  // Set to |true| when in edit mode
  inEditMode: false,

  init: function thlui_init() {
    var _ = navigator.mozL10n.get;

    this.tmpl = {
      thread: Utils.Template('messages-thread-tmpl')
    };

    // TODO: https://bugzilla.mozilla.org/show_bug.cgi?id=854413
    [
      'container', 'no-messages',
      'check-all-button', 'uncheck-all-button',
      'delete-button', 'cancel-button',
      'edit-icon', 'edit-mode', 'edit-form'
    ].forEach(function(id) {
      this[Utils.camelCase(id)] = document.getElementById('threads-' + id);
    }, this);

    this.mainWrapper = document.getElementById('main-wrapper');

    this.delNumList = [];
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
      'click', this.cancelEdit.bind(this)
    );

    this.editIcon.addEventListener(
      'click', this.startEdit.bind(this)
    );

    this.container.addEventListener(
      'click', this
    );

    this.editForm.addEventListener(
      'submit', this
    );
  },

  getAllInputs: function thlui_getAllInputs() {
    if (this.container) {
      return Array.prototype.slice.call(
        this.container.querySelectorAll('input[type=checkbox]')
      );
    } else {
      return [];
    }
  },

  getSelectedInputs: function thlui_getSelectedInputs() {
    if (this.container) {
      return Array.prototype.slice.call(
        this.container.querySelectorAll('input[type=checkbox]:checked')
      );
    } else {
      return [];
    }
  },

  setContact: function thlui_setContact(node) {
    var thread = Threads.get(node.dataset.threadId);
    var number, others;

    if (!thread) {
      return;
    }

    number = thread.participants[0];
    others = thread.participants.length - 1;

    if (!number) {
      return;
    }

    // TODO: This should use SimplePhoneMatcher

    Contacts.findByPhoneNumber(number, function gotContact(contacts) {
      var name = node.getElementsByClassName('name')[0];
      var photo = node.getElementsByTagName('img')[0];
      var title, src, details;

      if (contacts && contacts.length) {
        details = Utils.getContactDetails(number, contacts[0], {
          photoURL: true
        });
        title = details.title || number;
        src = details.photoURL || '';
      } else {
        title = number;
        src = '';
      }

      if (src) {
        photo.onload = photo.onerror = function revokePhotoURL() {
          this.onload = this.onerror = null;
          URL.revokeObjectURL(this.src);
        };
      }

      name.textContent = navigator.mozL10n.get('thread-header-text', {
        name: title,
        n: others
      });

      photo.src = src;
    });
  },

  handleEvent: function thlui_handleEvent(evt) {
    switch (evt.type) {
      case 'click':
        // Duck type determination; if the click event occurred on
        // a target with a |type| property, then assume it could've
        // been a checkbox and proceed w/ validation condition
        if (evt.target.type && evt.target.type === 'checkbox') {
          ThreadListUI.checkInputs();
        }
        break;
      case 'submit':
        evt.preventDefault();
        break;
    }
  },

  checkInputs: function thlui_checkInputs() {
    var _ = navigator.mozL10n.get;
    var selected = ThreadListUI.selectedInputs.length;

    if (selected === ThreadListUI.allInputs.length) {
      this.checkAllButton.disabled = true;
    } else {
      this.checkAllButton.disabled = false;
    }
    if (selected) {
      this.uncheckAllButton.disabled = false;
      this.deleteButton.classList.remove('disabled');
      this.editMode.innerHTML = _('selected', {n: selected});
    } else {
      this.uncheckAllButton.disabled = true;
      this.deleteButton.classList.add('disabled');
      this.editMode.innerHTML = _('editMode');
    }
  },

  cleanForm: function thlui_cleanForm() {
    var inputs = this.allInputs;
    var length = inputs.length;
    for (var i = 0; i < length; i++) {
      inputs[i].checked = false;
      inputs[i].parentNode.parentNode.classList.remove('undo-candidate');
    }
    this.delNumList = [];
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
    }
    this.checkInputs();
  },

  removeThread: function(threadId) {
    var li = document.getElementById('thread-' + threadId);
    var parent = li.parentNode;
    parent.removeChild(li);

    // remove the header and the ul for an empty list
    if (!parent.firstElementChild) {
      var grandparent = parent.parentNode;
      grandparent.removeChild(parent.previousSibling);
      grandparent.removeChild(parent);
      FixedHeader.refresh();

      // if we have no more elements, set empty classes
      if (!this.container.querySelector('li')) {
        this.setEmpty(true);
      }
    }
  },

  delete: function thlui_delete() {
    var question = navigator.mozL10n.get('deleteThreads-confirmation2');
    var messageIds = [];
    var threadIds, threadId, filter, count;

    function checkDone(threadId) {
      Threads.delete(threadId);
      // Cleanup the DOM
      this.removeThread(threadId);

      if (--count === 0) {
        this.cancelEdit();
        WaitingScreen.hide();
      }
    }

    if (confirm(question)) {
      WaitingScreen.show();

      threadIds = this.selectedInputs.map(function(input) {
        return input.value;
      });

      count = threadIds.length;

      // Remove and coerce the threadId back to a number
      // MozSmsFilter and all other platform APIs
      // expect this value to be a number.
      while (threadId = +threadIds.pop()) {

        // Filter and request all messages with this threadId
        filter = new MozSmsFilter();
        filter.threadId = threadId;

        MessageManager.getMessages({
          filter: filter,
          invert: true,
          each: function each(message) {
            MessageManager.deleteMessage(message.id);
            return true;
          },
          end: checkDone.bind(this, threadId)
        });
      }
    }
  },

  setEmpty: function thlui_setEmpty(empty) {
    var addWhenEmpty = empty ? 'add' : 'remove';
    var removeWhenEmpty = empty ? 'remove' : 'add';

    ThreadListUI.noMessages.classList[removeWhenEmpty]('hide');
    ThreadListUI.container.classList[addWhenEmpty]('hide');
    ThreadListUI.editIcon.classList[addWhenEmpty]('disabled');
  },

  startEdit: function thlui_edit() {
    this.inEditMode = true;
    this.cleanForm();
    this.mainWrapper.classList.toggle('edit');
  },

  cancelEdit: function thlui_cancelEdit() {
    this.inEditMode = false;
    this.mainWrapper.classList.remove('edit');
  },

  renderThreads: function thlui_renderThreads(threads, renderCallback) {

    // shut down this render
    var abort = false;

    // we store the function to kill the previous render on the function itself
    if (thlui_renderThreads.abort) {
      thlui_renderThreads.abort();
    }


    // TODO: https://bugzilla.mozilla.org/show_bug.cgi?id=854417
    // Refactor the rendering method: do not empty the entire
    // list on every render.
    ThreadListUI.container.innerHTML = '';

    if (threads.length) {
      thlui_renderThreads.abort = function thlui_renderThreads_abort() {
        abort = true;
      };

      ThreadListUI.setEmpty(false);

      FixedHeader.init('#threads-container',
                       '#threads-header-container',
                       'header');
      // Edit mode available

      var appendThreads = function(threads, callback) {
        if (!threads.length) {
          if (callback) {
            callback();
          }
          return;
        }

        setTimeout(function appendThreadsDelayed() {
          if (abort) {
            return;
          }
          ThreadListUI.appendThread(threads.pop());
          appendThreads(threads, callback);
        });
      };

      appendThreads(threads, function at_callback() {
        // Refresh fixed header logic
        FixedHeader.refresh();
        // clear up abort method
        delete thlui_renderThreads.abort;
        // Boot update of headers
        Utils.updateTimeHeaders();
        // Once the rendering it's done, callback if needed
        if (renderCallback) {
          renderCallback();
        }
      });
    } else {
      ThreadListUI.setEmpty(true);

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
    var li = document.createElement('li');
    var timestamp = thread.timestamp.getTime();
    var lastMessageType = thread.lastMessageType;
    var participants = thread.participants;
    var number = participants[0];
    var id = thread.id;
    var bodyHTML = Utils.escapeHTML(thread.body || '');

    li.id = 'thread-' + id;
    li.dataset.threadId = id;
    li.dataset.time = timestamp;
    li.dataset.lastMessageType = lastMessageType;


    if (thread.unreadCount > 0) {
      li.classList.add('unread');
    }


    // Render markup with thread data
    li.innerHTML = this.tmpl.thread.interpolate({
      id: id,
      number: number,
      bodyHTML: bodyHTML,
      formattedDate: Utils.getFormattedHour(timestamp)
    }, {
      safe: ['id', 'bodyHTML']
    });

    return li;
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
    var timestamp = thread.timestamp.getTime();
    // We create the DOM element of the thread
    var node = this.createThread(thread);

    // Update info given a number
    this.setContact(node);

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
        threadsContainer.insertBefore(node, threads[i]);
        break;
      }
    }
    if (!threadFound) {
      threadsContainer.appendChild(node);
    }
    if (this.inEditMode) {
      this.checkInputs();
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
    // Prevents cases where updateContactsInfo method is called
    // before ThreadListUI.container exists (as observed by errors
    // in the js console)
    if (!this.container) {
      return;
    }
    // Retrieve all 'li' elements
    var threads = this.container.getElementsByTagName('li');

    [].forEach.call(threads, this.setContact.bind(this));
  },

  mark: function thlui_mark(id, current) {
    var li = document.getElementById('thread-' + id);
    var remove = 'read';

    if (current === 'read') {
      remove = 'unread';
    }

    if (li) {
      li.classList.remove(remove);
      li.classList.add(current);
    }
  }
};

Object.defineProperty(ThreadListUI, 'allInputs', {
  get: function() {
    return this.getAllInputs();
  }
});

Object.defineProperty(ThreadListUI, 'selectedInputs', {
  get: function() {
    return this.getSelectedInputs();
  }
});
