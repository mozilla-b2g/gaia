/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global Template, Utils, Threads, Contacts, Threads,
         WaitingScreen, MozSmsFilter, MessageManager, TimeHeaders,
         Drafts, Thread, ThreadUI */
/*exported ThreadListUI */

'use strict';

var ThreadListUI = {
  // Used to track the current number of rendered
  // threads. Updated in ThreadListUI.renderThreads
  count: 0,

  // Set to |true| when in edit mode
  inEditMode: false,

  init: function thlui_init() {
    this.tmpl = {
      thread: Template('messages-thread-tmpl')
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

    navigator.mozContacts.addEventListener(
      'contactchange',
      this.updateContactsInfo.bind(this)
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
      var photo = node.querySelector('span[data-type=img]');
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
        Utils.asyncLoadRevokeURL(src);
      }

      navigator.mozL10n.localize(name, 'thread-header-text', {
        name: title,
        n: others
      });

      photo.style.backgroundImage = 'url(' + src + ')';
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
    var selected = ThreadListUI.selectedInputs.length;

    if (selected === ThreadListUI.allInputs.length) {
      this.checkAllButton.disabled = true;
    } else {
      this.checkAllButton.disabled = false;
    }
    if (selected) {
      this.uncheckAllButton.disabled = false;
      this.deleteButton.classList.remove('disabled');
      navigator.mozL10n.localize(this.editMode, 'selected', {n: selected});
    } else {
      this.uncheckAllButton.disabled = true;
      this.deleteButton.classList.add('disabled');
      navigator.mozL10n.localize(this.editMode, 'deleteMessages-title');
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

  removeThread: function thlui_removeThread(threadId) {
    var li = document.getElementById('thread-' + threadId);
    var parent = li.parentNode;
    parent.removeChild(li);

    // remove the header and the ul for an empty list
    if (!parent.firstElementChild) {
      var grandparent = parent.parentNode;
      grandparent.removeChild(parent.previousSibling);
      grandparent.removeChild(parent);

      // if we have no more elements, set empty classes
      if (!this.container.querySelector('li')) {
        this.setEmpty(true);
      }
    }
  },

  delete: function thlui_delete() {
    var question = navigator.mozL10n.get('deleteThreads-confirmation2');
    var threadIds, threadId, filter, count;

    function checkDone(threadId) {
      /* jshint validthis: true */
      Threads.delete(threadId);
      // Cleanup the DOM
      this.removeThread(threadId);

      if (--count === 0) {
        this.cancelEdit();
        WaitingScreen.hide();
      }
    }

    function deleteMessage(message) {
      MessageManager.deleteMessage(message.id);
      return true;
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
      while ((threadId = +threadIds.pop())) {

        // Filter and request all messages with this threadId
        filter = new MozSmsFilter();
        filter.threadId = threadId;

        MessageManager.getMessages({
          filter: filter,
          invert: true,
          each: deleteMessage,
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

  prepareRendering: function thlui_prepareRendering() {
    this.container.innerHTML = '';
  },

  startRendering: function thlui_startRenderingThreads() {
    this.setEmpty(false);
  },

  finalizeRendering: function thlui_finalizeRendering(empty) {
    if (empty) {
      this.setEmpty(true);
    }

    if (!empty) {
      TimeHeaders.updateAll('header[data-time-update]');
    }
  },

  renderThreads: function thlui_renderThreads(done) {
    var hasThreads = false;

    this.prepareRendering();

    function onRenderThread(thread) {
      /* jshint validthis: true */
      if (!hasThreads) {
        hasThreads = true;
        this.startRendering();
      }

      this.appendThread(thread);
    }

    function onThreadsRendered() {
      /* jshint validthis: true */
      this.finalizeRendering(!hasThreads);
    }

    var renderingOptions = {
      each: onRenderThread.bind(this),
      end: onThreadsRendered.bind(this),
      done: done
    };

    MessageManager.getThreads(renderingOptions);
  },

  createThread: function thlui_createThread(thread) {
    // Create DOM element
    var li = document.createElement('li');
    var timestamp = +thread.timestamp;
    var lastMessageType = thread.lastMessageType;
    var participants = thread.participants;
    var number = participants[0];
    var id = thread.id;
    var bodyHTML = Template.escape(thread.body || '');

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
      timestamp: String(timestamp)
    }, {
      safe: ['id', 'bodyHTML']
    });

    TimeHeaders.update(li.querySelector('time'));

    return li;
  },

  insertThreadContainer:
    function thlui_insertThreadContainer(group, timestamp) {
    // We look for placing the group in the right place.
    var headers = ThreadListUI.container.getElementsByTagName('header');
    var groupFound = false;
    for (var i = 0; i < headers.length; i++) {
      if (timestamp >= headers[i].dataset.time) {
        groupFound = true;
        ThreadListUI.container.insertBefore(group, headers[i].parentNode);
        break;
      }
    }
    if (!groupFound) {
      ThreadListUI.container.appendChild(group);
    }
  },

  updateThread: function thlui_updateThread(message, options) {
    var thread = Threads.createThreadMockup(message, options);
    var existingThreadElement = document.getElementById('thread-' + thread.id);
    var threadElementTime =
      existingThreadElement ? +existingThreadElement.dataset.time : NaN;
    var messageTime = +thread.timestamp;

    // Edge case: if we just received a message that is older than the latest
    // one in the thread, we only need to update the 'unread' status.
    var newMessageReceived = options && options.unread;
    if (newMessageReceived && threadElementTime > messageTime) {
      this.mark(thread.id, 'unread');
      return;
    }

    // If we just deleted messages in a thread but kept the last message
    // unchanged, we don't need to update the thread UI.
    var messagesDeleted = options && options.deleted;
    if (messagesDeleted && threadElementTime === messageTime) {
      return;
    }

    // General case: update the thread UI.
    if (existingThreadElement) {
      // remove the current thread node in order to place the new one properly
      this.removeThread(thread.id);
    }
    this.appendThread(thread);
    this.setEmpty(false);
  },

  onMessageSending: function thlui_onMessageSending(message) {
    this.updateThread(message);
  },

  onMessageReceived: function thlui_onMessageReceived(message) {
    this.updateThread(message, { unread: true });
  },

  appendThread: function thlui_appendThread(thread) {
    var timestamp = +thread.timestamp;
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
      // We create the wrapper with a 'header' & 'ul'
      var threadsContainerWrapper =
        ThreadListUI.createThreadContainer(timestamp);
      // Update threadsContainer with the new value
      threadsContainer = threadsContainerWrapper.childNodes[1];
      // Place our new content in the DOM
      ThreadListUI.insertThreadContainer(threadsContainerWrapper, timestamp);
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
    var threadContainer = document.createElement('div');
    // Create Header DOM Element
    var headerDOM = document.createElement('header');
    // Append 'time-update' state
    headerDOM.dataset.timeUpdate = 'repeat';
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
