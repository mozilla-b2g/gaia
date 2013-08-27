/* -*- Mode: js; tab-width: 2; indent-tabs-mode: nil; c-basic-offset: 2 -*- /
/* vim: set shiftwidth=2 tabstop=2 autoindent cindent expandtab: */
(function(exports) {
'use strict';

var ThreadListUI = {
  // Used to track the current number of rendered
  // threads. Updated in ThreadListUI.renderThreads
  count: 0,

  // Set to |true| when in edit mode
  inEditMode: false,

  init: function thlui_init() {
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

      navigator.mozL10n.localize(name, 'thread-header-text', {
        name: title,
        n: others
      });

      photo.src = src;
    });
  },

  handleEvent: function thlui_handleEvent(evt) {
    var selectAll = this.selectedInputs.length === this.allInputs.length;

    switch (evt.type) {
      case 'click':
        // Duck type determination; if the click event occurred on
        // a target with a |type| property, then assume it could've
        // been a checkbox and proceed w/ validation condition
        if (evt.target.type && evt.target.type === 'checkbox') {
          ThreadListUI.checkInputs();

          // Only update Threads.List.selectAll when
          // the user has actually interacted with the App.
          // ThreadListUI.checkInputs is called from too many
          // locations within the code and can results in setting
          // Threads.List.selectAll incorrectly.
          Threads.List.selectAll = selectAll;
        }
        break;
      case 'submit':
        evt.preventDefault();
        break;
    }
  },

  checkInputs: function thlui_checkInputs() {
    var selected = this.selectedInputs;
    var all = this.allInputs;
    var hasSelectedAll = false;
    var label;

    if (selected.length === all.length) {
      this.checkAllButton.disabled = true;
      hasSelectedAll = true;
    } else {
      this.checkAllButton.disabled = false;
    }

    if (selected.length > 0) {
      this.uncheckAllButton.disabled = false;
      this.deleteButton.classList.remove('disabled');
      label = Threads.List.selectAll || hasSelectedAll ?
        'selected-all' : 'selected';
      navigator.mozL10n.localize(this.editMode, label, {
        n: selected.length
      });
    } else {
      this.uncheckAllButton.disabled = true;
      this.deleteButton.classList.add('disabled');
      navigator.mozL10n.localize(this.editMode, 'editMode');
    }
  },

  cleanForm: function thlui_cleanForm() {
    var inputs = this.allInputs;
    var length = inputs.length;
    for (var i = 0; i < length; i++) {
      inputs[i].checked = false;
      inputs[i].parentNode.parentNode.classList.remove('undo-candidate');
    }
    navigator.mozL10n.localize(this.editMode, 'editMode');
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

    Threads.List.selectAll = value;

    this.checkInputs();
  },

  removeThread: function(threadId) {
    var li = document.getElementById('thread-' + threadId);
    var parent;

    if (li !== null) {
      parent = li.parentNode;
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
    }
    return true;
  },

  delete: function thlui_delete() {
    var question = navigator.mozL10n.get('deleteThreads-confirmation2');
    var selected = this.selectedInputs.slice();

    if (confirm(question)) {
      // Upon confirmation to Delete Threads...
      //
      // If the user had selected all threads, update
      // the deleteAll flag accordingly. This will be
      // used to optimize the following operations.
      Threads.List.deleteAll = Threads.List.selectAll;

      WaitingScreen.show();

      selected.forEach(function(input) {

        // Push the "id", as input.value coerced
        // to a number, to the list of threadIds for
        // removal processing.
        //
        // MozSmsFilter and all other platform APIs
        // expect this value to be a number.
        Threads.List.deleting.push(+input.value);

      }.bind(this));

      // Bulk remove threads from the DOM now
      // so that the user may continue using
      // the device as soon as possible.
      if (Threads.List.deleteAll &&
          this.getAllInputs.length === selected.length) {

        this.container.textContent = '';
        this.setEmpty(true);
        FixedHeader.refresh();
      } else {
        // Otherwise iterate and remove each explicitly
        // selected message node from the DOM.
        for (var id of Threads.List.deleting) {
          this.removeThread(id);
        }
      }

      this.delete.process();

      // Thread nodes are now removed from the DOM,
      // so safely exit from edit mode.
      this.cancelEdit(function() {
        // The DOM has been updated and user access
        // to the interface can be restored.
        WaitingScreen.hide();
      });
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
    this.mainWrapper.classList.add('edit');
  },

  cancelEdit: function thlui_cancelEdit(ontransitionend) {
    Threads.List.selectAll = false;

    function onTransitionEnd() {
      this.removeEventListener('transitionend', onTransitionEnd);
      if (typeof ontransitionend === 'function') {
        ontransitionend();
      }
    }

    this.inEditMode = false;

    this.mainWrapper.addEventListener('transitionend', onTransitionEnd);
    this.mainWrapper.classList.remove('edit');
  },

  renderThreads: function thlui_renderThreads(threads, optsOrCallback) {

    // shut down this render
    var abort = false;
    var onrendered = typeof optsOrCallback === 'function' ?
      optsOrCallback : null;
    var opts = onrendered === null ?
      optsOrCallback : {};

    opts = threadOpts(opts);

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

          var k = -1;
          var thread;

          // If Threads.List.deleteAll becomes true,
          // prevent further rendering of threads.
          //
          // Capture the remaining thread ids and
          // process them for deletion.
          //
          // This will never include new threads born
          // from received messages.
          //
          if (Threads.List.deleteAll) {
            while (thread = threads[++k]) {
              Threads.List.deleting.push(thread.id);
            }
            ThreadListUI.delete.process();
            Threads.List.selectAll = Threads.List.deleteAll = false;
            threads.length = 0;
            return;
          } else {

            ThreadListUI.appendThread(threads.pop(), {
              isSelected: Threads.List.selectAll
            });

            appendThreads(threads, callback);
          }
        });
      };

      appendThreads(threads, function at_callback() {
        // clear up abort method
        delete thlui_renderThreads.abort;
        // set the fixed header
        FixedHeader.refresh();
        // Boot update of headers
        Utils.updateTimeHeaders();
        // Once the rendering it's done, callback if needed
        if (onrendered) {
          onrendered();
        }
      });
    } else {
      ThreadListUI.setEmpty(true);
      FixedHeader.refresh();

      // Callback if exist
      if (onrendered) {
        setTimeout(function executeCB() {
          onrendered();
        });
      }
    }
  },

  createThread: function thlui_createThread(thread, opts) {
    // Create DOM element
    var li = document.createElement('li');
    var timestamp = thread.timestamp.getTime();
    var lastMessageType = thread.lastMessageType;
    var participants = thread.participants;
    var number = participants[0];
    var id = thread.id;
    var bodyHTML = Utils.escapeHTML(thread.body || '');

    opts = threadOpts(opts);

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

    // If this is a newly rendered node, from previously existing
    // nodes and the user has tapped "Select All", then this
    // should be "born" selected.
    //
    // Otherwise, an explicit `isSelected: false` will be set
    // for newly arrived & created threads
    if (opts.isSelected) {
      li.querySelector('input[type="checkbox"]').checked = true;
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

  // This method fills the gap while we wait for next 'getThreads' request,
  // letting us rendering the new thread with a better performance.
  createThreadMockup: function mm_createThreadMockup(message) {
    // Given a message we create a thread as a mockup. This let us render the
    // thread without requesting Gecko, so we increase the performance and we
    // reduce Gecko requests.
    return {
      id: message.threadId,
      participants: [message.sender],
      body: message.body,
      timestamp: message.timestamp,
      unreadCount: 1,
      lastMessageType: message.type || 'sms'
    };
  },

  onMessageReceived: function thlui_onMessageReceived(message) {
    var threadMockup = this.createThreadMockup(message);
    var threadId = message.threadId;

    // This will either set new or update an existing thread.
    // Any message objects that already exist for this thread
    // will be silently rejected to avoid dups.
    Threads.set(threadId, threadMockup).messages.push(message);

    if (this.container.querySelector('ul')) {
      var timestamp = threadMockup.timestamp.getTime();
      var previousThread = document.getElementById('thread-' + threadId);
      if (previousThread && previousThread.dataset.time > timestamp) {
        // If the received SMS it's older that the latest one
        // We need only to update the 'unread status'
        this.mark(threadId, 'unread');
        return;
      }

      // We remove the previous one in order to place the new one properly
      if (previousThread) {
        this.removeThread(threadId);
      }

      this.appendThread(threadMockup, { isSelected: false });
      FixedHeader.refresh();
      this.setEmpty(false);
    } else {
      this.renderThreads([threadMockup], { isSelected: false });
    }
  },

  appendThread: function thlui_appendThread(thread, opts) {
    var timestamp = thread.timestamp.getTime();

    opts = threadOpts(opts);

    // We create the DOM element of the thread
    var node = this.createThread(thread, opts);

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

ThreadListUI.delete.process = function() {
  var k = -1;
  var deleting = Threads.List.deleting.slice();
  var filter, id;

  // Create an "end" handler that can
  // have a bound threadId param, otherwise
  // the threadId is lost by the time the
  // end handler is called.
  function onEnd(threadId) {
    var list = Threads.List.tracking[threadId];

    MessageManager.deleteMessages(list, function() {

      Threads.delete(threadId);

      Threads.List.deleting.splice(
        Threads.List.deleting.indexOf(threadId), 1
      );

      // Once all reference threadIds have been
      // have been removed, the deleteAll flag
      // is reset to false.
      if (!Threads.List.deleting.length) {

        Threads.List.deleteAll = false;
      }

      delete Threads.List.tracking[threadId];
    });
  }

  // Create a shared MozSmsFilter.
  // Initialization of MozSmsFilter object's is
  // an inordinately expensive operation.
  //
  //  See: http://jsperf.com/mozsmsfilter-vs-messagesfilter
  //
  // Unfortunately, using a plain object with a
  // |threadId| property throws an exception.
  //
  filter = new MozSmsFilter();

  while (id = deleting[++k]) {

    filter.threadId = id;

    // Create a cache for tracking message.ids
    // corresponding to a particular thread
    // (keyed by id).
    //
    // - In the "each" handler, this is used
    //    to capture the message.id of each
    //    message returned by the cursor.
    //
    // - In the "end" handler, this is used to
    //    send the final list of message.ids to
    //    This is used by the onEnd
    //
    Threads.List.tracking[id] = [];

    MessageManager.getMessages({
      filter: filter,
      invert: true,
      endArgs: id,
      each: function each(message) {
        Threads.List.tracking[message.threadId].push(message.id);
        return true;
      },
      end: onEnd.bind(this, id)
    });
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

/**
 * threadOpts
 *
 * Normalize options object for thread node creation
 */
function threadOpts(opts) {

  opts = opts || {};

  opts.isSelected = typeof opts.isSelected !== 'undefined' ?
    opts.isSelected : Threads.List.selectAll;

  return opts;
}

exports.ThreadListUI = ThreadListUI;

}(this));
