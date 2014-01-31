/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global Template, Utils, Threads, Contacts, URL, FixedHeader, Threads,
         WaitingScreen, MozSmsFilter, MessageManager, TimeHeaders,
         Drafts, Thread, ThreadUI */
/*exported ThreadListUI */
(function(exports) {
'use strict';

var ThreadListUI = {
  draftLinks: null,
  draftRegistry: null,
  DRAFT_SAVED_DURATION: 5000,

  // Used to track timeouts
  timeouts: {
    onDraftSaved: null
  },

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
      'edit-icon', 'edit-mode', 'edit-form', 'draft-saved-banner'
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

    this.draftLinks = new Map();
    ThreadListUI.draftRegistry = {};
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
    var draft = Drafts.get(node.dataset.threadId);
    var number, others;

    if (thread) {
      number = thread.participants[0];
      others = thread.participants.length - 1;
    } else if (draft) {
      number = draft.recipients[0];
      others = draft.recipients.length - 1;
    } else {
      console.error(
        'This node does not look like a displayed list item: ',
        node.dataset.threadId
      );
      return;
    }

    if (!number) {
      navigator.mozL10n.localize(
        node.querySelector('.name'), 'no-recipient'
      );
      return;
    }

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

      navigator.mozL10n.localize(name, 'thread-header-text', {
        name: title,
        n: others
      });

      photo.src = src;
    });
  },

  handleEvent: function thlui_handleEvent(event) {
    var draftId;

    switch (event.type) {
      case 'click':
        // Duck type determination; if the click event occurred on
        // a target with a |type| property, then assume it could've
        // been a checkbox and proceed w/ validation condition
        if (event.target.type && event.target.type === 'checkbox') {
          this.checkInputs();
        }

        if ((draftId = this.draftLinks.get(event.target))) {
          ThreadUI.draft = Drafts.get(draftId);
        }

        break;
      case 'submit':
        event.preventDefault();
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
    var parent, draftId;

    if (li) {
      parent = li.parentNode;
      li.remove();
    }

    if ((draftId = this.draftLinks.get(li))) {
      this.draftLinks.delete(li);

      delete this.draftRegistry[draftId];
    }

    // remove the header and the ul for an empty list
    if (parent && !parent.firstElementChild) {
      parent.previousSibling.remove();
      parent.remove();

      FixedHeader.refresh();

      // if we have no more elements, set empty classes
      if (!this.container.querySelector('li')) {
        this.setEmpty(true);
      }
    }
  },

  delete: function thlui_delete() {
    var question = navigator.mozL10n.get('deleteThreads-confirmation2');
    var list, length, id, threadId, filter, count;

    function checkDone(threadId) {
      /* jshint validthis: true */
      // Threads.delete will handle deleting
      // any Draft objects associated with the
      // specified threadId.
      Threads.delete(threadId);

      // Cleanup the DOM
      this.removeThread(threadId);

      if (--count === 0) {
        this.cancelEdit();
        Drafts.store();
        WaitingScreen.hide();
      }
    }

    function deleteMessage(message) {
      MessageManager.deleteMessage(message.id);
      return true;
    }

    if (confirm(question)) {
      WaitingScreen.show();

      list = this.selectedInputs.reduce(function(list, input) {
        list[input.dataset.mode].push(+input.value);
        return list;
      }, { drafts: [], threads: [] });

      if (list.drafts.length) {
        length = list.drafts.length;

        for (var i = 0; i < length; i++) {
          id = list.drafts[i];
          Drafts.delete(Drafts.get(id));
          this.removeThread(id);
        }

        Drafts.store();

        // In cases where no threads are being deleted,
        // reset and restore the UI from edit mode and
        // exit immediately.
        if (list.threads.length === 0) {
          this.cancelEdit();
          WaitingScreen.hide();
          return;
        }
      }

      count = list.threads.length;

      // Remove and coerce the threadId back to a number
      // MozSmsFilter and all other platform APIs
      // expect this value to be a number.
      while ((threadId = +list.threads.pop())) {

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

  renderDrafts: function thlui_renderDrafts() {
    // Request and render all threads with drafts
    // or thread-less drafts.
    Drafts.request(function() {
      Drafts.forEach(function(draft, threadId) {
        if (threadId) {
          // Find draft-containing threads that have already been rendered
          // and update them so they mark themselves appropriately
          var el = document.getElementById('thread-' + threadId);
          if (el) {
            this.updateThread(Threads.get(threadId));
          }
        } else {
          // Safely assume there is a threadless draft
          this.setEmpty(false);

          // If there is currently no list item rendered for this
          // draft, then proceed.
          if (!this.draftRegistry[draft.id]) {
            this.appendThread(
              Thread.create(draft)
            );
          }
        }
      }, this);

      FixedHeader.refresh();
    }.bind(this));
  },

  prepareRendering: function thlui_prepareRendering() {
    this.container.innerHTML = '';
    this.renderDrafts();
  },

  startRendering: function thlui_startRenderingThreads() {
    this.setEmpty(false);

    FixedHeader.init('#threads-container',
                     '#threads-header-container',
                     'header');
  },

  finalizeRendering: function thlui_finalizeRendering(empty) {
    if (empty) {
      this.setEmpty(true);
    }

    FixedHeader.refresh();

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

      /* We set the view as empty only if there's no threads and no drafts,
       * this is done to prevent races between renering threads and drafts. */
      this.finalizeRendering(!(hasThreads || Drafts.size));
    }

    var renderingOptions = {
      each: onRenderThread.bind(this),
      end: onThreadsRendered.bind(this),
      done: done
    };

    MessageManager.getThreads(renderingOptions);
  },

  createThread: function thlui_createThread(record) {
    // Create DOM element
    var li = document.createElement('li');
    var timestamp = +record.timestamp;
    var type = record.lastMessageType;
    var participants = record.participants;
    var number = participants[0];
    var id = record.id;
    var bodyHTML = record.body;
    var thread = Threads.get(id);
    var draft, draftId;

    // A new conversation "is" a draft
    var isDraft = typeof thread === 'undefined';

    // A an existing conversation "has" a draft
    // (or it doesn't, depending on the value
    // returned by thread.hasDrafts)
    var hasDrafts = isDraft ? false : thread.hasDrafts;

    if (hasDrafts) {
      draft = Drafts.byThreadId(thread.id).latest;
      timestamp = Math.max(draft.timestamp, timestamp);
      // If the draft is newer than the message, update
      // the body with the draft content's first string.
      if (draft.timestamp >= record.timestamp) {
        bodyHTML = draft.content.find(function(content) {
          if (typeof content === 'string') {
            return true;
          }
        });
        type = draft.type;
      }
    }

    bodyHTML = Template.escape(bodyHTML || '');

    li.id = 'thread-' + id;
    li.dataset.threadId = id;
    li.dataset.time = timestamp;
    li.dataset.lastMessageType = type;

    if (record.unreadCount > 0) {
      li.classList.add('unread');
    }

    if (hasDrafts || isDraft) {
      // Set the "draft" visual indication
      li.classList.add('draft');

      if (hasDrafts) {
        li.classList.add('has-draft');
      } else {
        li.classList.add('is-draft');
      }


      draftId = hasDrafts ? draft.id : record.id;

      // Used in renderDrafts as an efficient mechanism
      // for checking whether a draft of a specific ID
      // has been rendered.
      this.draftRegistry[draftId] = true;
    }

    // Render markup with thread data
    li.innerHTML = this.tmpl.thread.interpolate({
      hash: isDraft ? '#new' : '#thread=' + id,
      mode: isDraft ? 'drafts' : 'threads',
      id: isDraft ? draftId : id,
      number: number,
      bodyHTML: bodyHTML,
      timestamp: String(timestamp)
    }, {
      safe: ['id', 'bodyHTML']
    });

    TimeHeaders.update(li.querySelector('time'));

    if (draftId) {
      // Used in handleEvent to set the ThreadUI.draft object
      this.draftLinks.set(
        li.querySelector('a'), draftId
      );
    }

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

  updateThread: function thlui_updateThread(record, options) {
    var thread = Thread.create(record, options);

    // For legitimate in-memory thread objects, update the stored
    // Thread instance with the newest data. This check prevents
    // draft objects from inadvertently creating bogus thread
    // objects.
    if (Threads.has(thread.id)) {
      Threads.set(thread.id, thread);
    }

    // We remove the previous one in order to place the new one properly
    var node = document.getElementById('thread-' + thread.id);

    // If options passed and new record is older than the latest one?
    if (node && +node.dataset.time > +thread.timestamp) {
      // If the received Message is older than the latest one
      // We need only to update the 'unread status' if needed
      if (options && !options.read) {
        this.mark(thread.id, 'unread');
      }
    } else {
      if (node) {
        this.removeThread(thread.id);
      }
      this.appendThread(thread);
      this.setEmpty(false);
      FixedHeader.refresh();
    }
  },

  onMessageSending: function thlui_onMessageSending(message) {
    this.updateThread(message);
  },

  onMessageReceived: function thlui_onMessageReceived(message) {
    this.updateThread(message, {read: false});
  },

  appendThread: function thlui_appendThread(thread) {
    var timestamp = +thread.timestamp;
    var drafts = Drafts.byThreadId(thread.id);

    if (drafts.length) {
      timestamp = Math.max(drafts.latest.timestamp, timestamp);
    }

    // We create the DOM element of the thread
    var node = this.createThread(thread);

    // Update info given a number
    this.setContact(node);

    // Is there any container already?
    var threadsContainerID = 'threadsContainer_' +
                              Utils.getDayDate(timestamp);
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
  },

  onDraftSaved: function thlui_onDraftSaved() {
    this.draftSavedBanner.classList.remove('hide');

    clearTimeout(this.timeouts.onDraftSaved);
    this.timeouts.onDraftSaved = null;

    this.timeouts.onDraftSaved = setTimeout(function hideDraftSavedBanner() {
      this.draftSavedBanner.classList.add('hide');
    }.bind(this), this.DRAFT_SAVED_DURATION);
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

exports.ThreadListUI = ThreadListUI;

}(this));
