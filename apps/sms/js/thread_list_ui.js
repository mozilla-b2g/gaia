/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */

/*global Template, Utils, Threads, Contacts, Threads,
         WaitingScreen, MessageManager, TimeHeaders,
         Drafts, Thread, ThreadUI, OptionMenu, ActivityPicker,
         PerformanceTestingHelper, StickyHeader, Navigation, Dialog */
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
      'check-uncheck-all-button',
      'delete-button', 'edit-header',
      'options-icon', 'edit-mode', 'edit-form', 'draft-saved-banner'
    ].forEach(function(id) {
      this[Utils.camelCase(id)] = document.getElementById('threads-' + id);
    }, this);

    this.mainWrapper = document.getElementById('main-wrapper');
    this.composerButton = document.getElementById('icon-add');

    this.delNumList = [];

    // TODO this should probably move to a "WrapperView" class
    this.composerButton.addEventListener(
      'click', this.launchComposer.bind(this)
    );

    this.checkUncheckAllButton.addEventListener(
      'click', this.toggleCheckedAll.bind(this)
    );

    this.deleteButton.addEventListener(
      'click', this.delete.bind(this)
    );

    this.editHeader.addEventListener(
      'action', this.cancelEdit.bind(this)
    );

    this.optionsIcon.addEventListener(
      'click', this.showOptions.bind(this)
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

    MessageManager.on('message-sending', this.onMessageSending.bind(this));
    MessageManager.on('message-received', this.onMessageReceived.bind(this));
    MessageManager.on('threads-deleted', this.onThreadsDeleted.bind(this));

    this.sticky = null;
  },

  initStickyHeader: function thlui_initStickyHeader() {
    if (!this.sticky) {
      this.sticky =
        new StickyHeader(this.container, document.getElementById('sticky'));
    }
  },

  beforeLeave: function thlui_beforeLeave() {
    // This should be in afterLeave, but the edit mode interface does not seem
    // to slide correctly. Bug 1009541
    this.cancelEdit();
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
      node.querySelector('.name').setAttribute('data-l10n-id', 'no-recipient');
      return;
    }

    Contacts.findByAddress(number, function gotContact(contacts) {
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
        Contacts.addUnknown(title);
      }

      var photoUrl = node.dataset.photoUrl;
      if (photoUrl) {
        window.URL.revokeObjectURL(photoUrl);
      }

      if (src) {
        node.dataset.photoUrl = src;
      } else if (photoUrl) {
        node.dataset.photoUrl = '';
      }

      navigator.mozL10n.setAttributes(name, 'thread-header-text', {
        name: title,
        n: others
      });

      if (src === '') {
        photo.style.backgroundImage = null;
        photo.parentNode.classList.add('empty');
      } else {
        photo.style.backgroundImage = 'url(' + src + ')';
        photo.parentNode.classList.remove('empty');
      }
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

        if (event.target.nodeName === 'LABEL') {
          return;
        }

        if ((draftId = this.draftLinks.get(event.target))) {
          // TODO: Bug 1010216: remove this
          ThreadUI.draft = Drafts.get(draftId);
        }

        var parent = event.target.parentNode;
        var parentThreadId = parent.dataset.threadId;

        if (parentThreadId) {
          event.preventDefault();
          // TODO Bug 1014226 will introduce a draftId instead of threadId for
          // drafts, this will allow removing the test with is-draft here.
          if (parent.classList.contains('is-draft')) {
            Navigation.toPanel('composer', {
              draftId: +parentThreadId
            });
          } else {
            Navigation.toPanel('thread', {
              id: +parentThreadId
            });
          }
        }

        break;
      case 'submit':
        event.preventDefault();
        break;
    }
  },

  launchComposer: function thui_launchComposer(e) {
    // prevent following the link, see also bug 1014219
    e.preventDefault();
    Navigation.toPanel('composer');
  },

  checkInputs: function thlui_checkInputs() {
    var selected = ThreadListUI.selectedInputs.length;

    if (selected === ThreadListUI.allInputs.length) {
      this.checkUncheckAllButton.setAttribute('data-l10n-id', 'deselect-all');
    } else {
      this.checkUncheckAllButton.setAttribute('data-l10n-id', 'select-all');
    }
    if (selected) {
      this.deleteButton.disabled = false;
      navigator.mozL10n.setAttributes(this.editMode, 'selected-threads', {
        n: selected
      });
    } else {
      this.deleteButton.disabled = true;
      navigator.mozL10n.setAttributes(this.editMode, 'selectThreads-title');
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

  // if no thread or few are checked : select all the threads
  // and if all threads are checked : deselect them all.
  toggleCheckedAll: function thlui_select() {
    var selected = ThreadListUI.selectedInputs.length;
    var allSelected = (selected === ThreadListUI.allInputs.length);
    var inputs = this.container.querySelectorAll(
      'input[type="checkbox"]' +
      (!allSelected ? ':not(:checked)' : ':checked')
    );
    var length = inputs.length;
    for (var i = 0; i < length; i++) {
      inputs[i].checked = !allSelected;
    }
    this.checkInputs();
  },

  removeThread: function thlui_removeThread(threadId) {
    var li = document.getElementById('thread-' + threadId);
    var parent, draftId;
    var photoUrl = li && li.dataset.photoUrl;

    // Revoke the contact photo while deletion for avoiding intermittent
    // photo disappear issue.
    if (photoUrl) {
      window.URL.revokeObjectURL(photoUrl);
    }

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

      this.sticky && this.sticky.refresh();

      // if we have no more elements, set empty classes
      if (!this.container.querySelector('li')) {
        this.setEmpty(true);
      }
    }
  },

  // Since removeThread will revoke list photoUrl at the end of deletion,
  // please make sure url will also be revoked if new delete api remove threads
  // without calling removeThread in the future.
  delete: function thlui_delete() {
    var list, length, id, threadId, filter, count;

    function checkDone(threadId) {
      /* jshint validthis: true */
      this.deleteThread(threadId);

      if (--count === 0) {
        Drafts.store();

        completeDeletion();
      }
    }

    function deleteMessage(message) {
      MessageManager.deleteMessages(message.id);
      return true;
    }

    function completeDeletion() {
      ThreadListUI.cancelEdit();
      WaitingScreen.hide();
    }

    function performDeletion() {
      /* jshint validthis: true */
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
      }

      count = list.threads.length;

      // In cases where no threads are being deleted, reset and restore the UI
      // from edit mode and exit immediately.
      if (count === 0) {
        completeDeletion();
        return;
      }

      // Remove and coerce the threadId back to a number
      // MobileMessageFilter and all other platform APIs
      // expect this value to be a number.
      while ((threadId = +list.threads.pop())) {
        // Filter and request all messages with this threadId
        filter = { threadId: threadId };

        MessageManager.getMessages({
          filter: filter,
          invert: true,
          each: deleteMessage,
          end: checkDone.bind(this, threadId)
        });
      }
    }

    var dialog = new Dialog({
      title: {
        l10nId: 'messages'
      },
      body: {
        l10nId: 'deleteThreads-confirmation2'
      },
      options: {
        cancel: {
          text: {
            l10nId: 'cancel'
          }
        },
        confirm: {
          text: {
            l10nId: 'delete'
          },
          method: performDeletion.bind(this),
          className: 'danger'
        }
      }
    });

    dialog.show();
  },

  setEmpty: function thlui_setEmpty(empty) {
    var addWhenEmpty = empty ? 'add' : 'remove';
    var removeWhenEmpty = empty ? 'remove' : 'add';

    ThreadListUI.noMessages.classList[removeWhenEmpty]('hide');
    ThreadListUI.container.classList[addWhenEmpty]('hide');
  },

  showOptions: function thlui_options() {
    var params = {
      items: [{
        l10nId: 'settings',
        method: function oSettings() {
          ActivityPicker.openSettings();
        }
      },{ // Last item is the Cancel button
        l10nId: 'cancel',
        incomplete: true
      }]
    };

    // Add delete option when list is not empty
    if (ThreadListUI.noMessages.classList.contains('hide')) {
      params.items.unshift({
        l10nId: 'selectThreads-label',
        method: this.startEdit.bind(this)
      });
    }

    new OptionMenu(params).show();
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

      this.sticky && this.sticky.refresh();
    }.bind(this));
  },

  prepareRendering: function thlui_prepareRendering() {
    this.container.innerHTML = '';
    this.renderDrafts();
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

    this.sticky && this.sticky.refresh();
  },

  renderThreads: function thlui_renderThreads(firstViewDoneCb, allDoneCb) {
    PerformanceTestingHelper.dispatch('will-render-threads');

    var hasThreads = false;
    var firstPanelCount = 9; // counted on a Peak

    this.prepareRendering();

    var firstViewDone = function firstViewDone() {
      this.initStickyHeader();
      firstViewDoneCb();
    }.bind(this);

    function onRenderThread(thread) {
      /* jshint validthis: true */
      // Register all threads to the Threads object.
      Threads.set(thread.id, thread);

      // If one of the requested threads is also the currently displayed thread,
      // update the header immediately
      // TODO: Revise necessity of this code in bug 1050823
      if (Navigation.isCurrentPanel('thread', { id: thread.id })) {
        ThreadUI.updateHeaderData();
      }

      if (!hasThreads) {
        hasThreads = true;
        this.startRendering();
      }

      this.appendThread(thread);
      if (--firstPanelCount === 0) {
        // dispatch visually-complete and content-interactive when rendered
        // threads could fill up the top of the visiable area
        window.dispatchEvent(new CustomEvent('moz-app-visually-complete'));
        firstViewDone();
      }
    }

    function onThreadsRendered() {
      /* jshint validthis: true */

      /* We set the view as empty only if there's no threads and no drafts,
       * this is done to prevent races between renering threads and drafts. */
      this.finalizeRendering(!(hasThreads || Drafts.size));

      if (firstPanelCount > 0) {
        // dispatch visually-complete and content-interactive when rendering
        // ended but threads could not fill up the top of the visiable area
        window.dispatchEvent(new CustomEvent('moz-app-visually-complete'));
        firstViewDone();
      }
    }

    var renderingOptions = {
      each: onRenderThread.bind(this),
      end: onThreadsRendered.bind(this),
      done: allDoneCb
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
    var iconLabel = '';

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
    li.classList.add('threadlist-item');

    if (hasDrafts || isDraft) {
      // Set the "draft" visual indication
      li.classList.add('draft');

      if (hasDrafts) {
        li.classList.add('has-draft');
        iconLabel = 'has-draft';
      } else {
        li.classList.add('is-draft');
        iconLabel = 'is-draft';
      }


      draftId = hasDrafts ? draft.id : record.id;

      // Used in renderDrafts as an efficient mechanism
      // for checking whether a draft of a specific ID
      // has been rendered.
      this.draftRegistry[draftId] = true;
    }

    if (record.unreadCount > 0) {
      li.classList.add('unread');
      iconLabel = 'unread-thread';
    }

    // Render markup with thread data
    li.innerHTML = this.tmpl.thread.interpolate({
      hash: isDraft ? '#composer' : '#thread=' + id,
      mode: isDraft ? 'drafts' : 'threads',
      id: isDraft ? draftId : id,
      number: number,
      bodyHTML: bodyHTML,
      timestamp: String(timestamp),
      iconLabel: iconLabel
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

  deleteThread: function(threadId) {
    // Threads.delete will handle deleting
    // any Draft objects associated with the
    // specified threadId.
    Threads.delete(threadId);

    // Cleanup the DOM
    this.removeThread(threadId);

    // Remove notification if exist
    Utils.closeNotificationsForThread(threadId);
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

  updateThread: function thlui_updateThread(record, options) {
    var thread = Thread.create(record, options);
    var threadUINode = document.getElementById('thread-' + thread.id);
    var threadUITime = threadUINode ? +threadUINode.dataset.time : NaN;
    var recordTime = +thread.timestamp;

    // For legitimate in-memory thread objects, update the stored
    // Thread instance with the newest data. This check prevents
    // draft objects from inadvertently creating bogus thread
    // objects.
    if (Threads.has(thread.id)) {
      Threads.set(thread.id, thread);
    }

    // Edge case: if we just received a message that is older than the latest
    // one in the thread, we only need to update the 'unread' status.
    var newMessageReceived = options && options.unread;
    if (newMessageReceived && threadUITime > recordTime) {
      this.mark(thread.id, 'unread');
      return;
    }

    // If we just deleted messages in a thread but kept the last message
    // unchanged, we don't need to update the thread UI.
    var messagesDeleted = options && options.deleted;
    if (messagesDeleted && threadUITime === recordTime) {
      return;
    }

    // General case: update the thread UI.
    if (threadUINode) {
      // remove the current thread node in order to place the new one properly
      this.removeThread(thread.id);
    }

    this.setEmpty(false);
    if (this.appendThread(thread)) {
      this.sticky && this.sticky.refresh();
    }
  },

  onMessageSending: function thlui_onMessageSending(e) {
    this.updateThread(e.message);
  },

  onMessageReceived: function thlui_onMessageReceived(e) {
    // If user currently in the same thread, then mark thread as read
    var markAsRead = Navigation.isCurrentPanel('thread', {
      id: e.message.threadId
    });

    this.updateThread(e.message, { unread: !markAsRead });
  },

  onThreadsDeleted: function thlui_onThreadDeleted(e) {
    e.ids.forEach(function(threadId) {
      if (Threads.has(threadId)) {
        this.deleteThread(threadId);
      }
    }, this);
  },

  /**
   * Append a thread to the global threads container. Creates a time container
   * (i.e. for a day or some other time period) for this thread if it doesn't
   * exist already.
   *
   * @return Boolean true if a time container was created, false otherwise
   */
  appendThread: function thlui_appendThread(thread) {
    if (navigator.mozL10n.readyState !== 'complete') {
      navigator.mozL10n.once(this.appendThread.bind(this, thread));
      return;
    }

    var timestamp = +thread.timestamp;
    var drafts = Drafts.byThreadId(thread.id);
    var firstThreadInContainer = false;

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
      // We create the wrapper with a 'header' & 'ul'
      var threadsContainerWrapper =
        ThreadListUI.createThreadContainer(timestamp);
      // Update threadsContainer with the new value
      threadsContainer = threadsContainerWrapper.childNodes[1];
      // Place our new content in the DOM
      ThreadListUI.insertThreadContainer(threadsContainerWrapper, timestamp);
      // We had to create a container, so this will be the first thread in it.
      firstThreadInContainer = true;
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

    return firstThreadInContainer;
  },

  // Adds a new grouping header if necessary (today, tomorrow, ...)
  createThreadContainer: function thlui_createThreadContainer(timestamp) {
    var threadContainer = document.createElement('div');
    // Create Header DOM Element
    var headerDOM = document.createElement('header');

    // The id is used by the sticky header code as the -moz-element target.
    headerDOM.id = 'header_' + timestamp;

    // Append 'time-update' state
    headerDOM.dataset.timeUpdate = 'repeat';
    headerDOM.dataset.time = timestamp;
    headerDOM.dataset.dateOnly = true;

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
  updateContactsInfo: function thlui_updateContactsInfo() {
    Contacts.clearUnknown();
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
